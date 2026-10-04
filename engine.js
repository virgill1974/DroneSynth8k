// DroneSynth8k deterministic engine.
// Every line here has a 1:1 counterpart in the C++ export (export.js). Rules:
//  - double precision only, only + - * / sqrt (correctly rounded in V8 and SSE2)
//  - no Math.sin/cos/pow/exp/log: own polynomial versions below
//  - all user parameters are integers
//  - keep the operation order identical to the C++ template when changing anything
(function (G) {
  'use strict';
  var PI = 3.141592653589793, PI_2 = 1.5707963267948966, TWO_PI = 6.283185307179586, LN2 = 0.6931471805599453;
  var ATT = 3.321928094887362 / 13107200; // log2(10)/(20*655360): DLS gain units -> exp2 argument
  var SR = 44100;

  function msin(x) {
    while (x > PI) x -= TWO_PI;
    while (x < -PI) x += TWO_PI;
    if (x > PI_2) x = PI - x; else if (x < -PI_2) x = -PI - x;
    var x2 = x * x, r = 1;
    for (var k = 16; k > 0; k -= 2) r = 1 - x2 / ((k + 1) * k) * r;
    return x * r;
  }

  function mexp2(x) {
    var s = 1;
    while (x < 0) { x += 1; s *= 0.5; }
    while (x >= 1) { x -= 1; s *= 2; }
    var t = x * LN2, r = 1;
    for (var k = 14; k > 0; k--) r = 1 + t / k * r;
    return s * r;
  }

  // Region choice used by both engine and C++: first region with note<=hi, else the last one.
  function pick(rl, e) {
    var r = null;
    for (var k = 0; k < rl.length; k++) { r = rl[k]; if (e <= r.hi) break; }
    return r;
  }

  function msToS(ms) { return Math.floor(ms * 441 / 10); }

  // song -> compiled integer description (exactly what gets exported)
  // song: { bpm, lpb, rows, pat[8][rows], ins[8]{prog,att,rel,vol,pan}, ps{win,st,seed,gain} }
  function compile(song, dls, opt) {
    opt = opt || {};
    var rows = song.rows, rowLen = opt.rowLen || Math.floor(2646000 / (song.bpm * song.lpb));
    var c = { rows: rows, rowLen: rowLen, pat: [], ins: [], warn: [] }, tail = 0;
    for (var ch = 0; ch < 8; ch++) {
      var I = song.ins[ch], full = (dls && dls.ins[I.prog]) || [], used = [], p = [];
      for (var row = 0; row < rows; row++) {
        var e = song.pat[ch][row] | 0;
        if (e > 0 && e < 128) {
          var r = null;
          for (var k = 0; k < full.length; k++) if (e >= full[k].lo && e <= full[k].hi) { r = full[k]; break; }
          if (!r) r = pick(full, e);
          if (!r || r.wave.bits !== 16 || r.wave.ch !== 1 || !(r.wave.len > 0)) {
            var msg = 'Kanal ' + (ch + 1) + ': ' + (r ? 'Sample nicht 16-Bit-Mono' : 'kein Sample');
            if (c.warn.indexOf(msg) < 0) c.warn.push(msg);
            e = 0;
          }
          else if (used.indexOf(r) < 0) used.push(r);
        }
        p.push(e);
      }
      used.sort(function (a, b) { return a.hi - b.hi; });
      var rg = used.map(function (r) {
        var w = r.wave, ls = r.ls, ll = r.ll;
        if (ls >= w.len) { ls = 0; ll = 0; }
        if (ls + ll > w.len) ll = w.len - ls;
        return { hi: r.hi, off: w.off, len: w.len, ls: ls, ll: ll, unity: r.unity, fine: r.fine, rate: w.rate, attn: r.attn };
      });
      var ci = { att: msToS(I.att), rel: msToS(I.rel), vol: I.vol, pan: I.pan, rg: rg };
      if (ci.rel > tail) tail = ci.rel;
      c.pat.push(p);
      c.ins.push(ci);
    }
    c.dryLen = rows * rowLen + tail;
    var P = song.ps;
    c.win = P.win; c.st = P.st; c.seed = P.seed >>> 0; c.gain = P.gain;
    var N = 1 << c.win, H = N >> 1, disp = H * 10 / c.st, frames = 0;
    for (var sp = 0; sp < c.dryLen; sp += disp) frames++;
    c.outLen = frames * H + H;
    if (dls) c.dlsSize = dls.size;
    return c;
  }

  // attach PCM (Int16Array per region) for the JS renderer; C++ reads straight from the file image
  function attachPcm(c, dls) {
    var dv = new DataView(dls.bytes.buffer, dls.bytes.byteOffset);
    c.ins.forEach(function (I) {
      I.rg.forEach(function (r) {
        var d = new Int16Array(r.len);
        for (var i = 0; i < r.len; i++) d[i] = dv.getInt16(r.off + 2 * i, true);
        r.pcm = d;
      });
    });
  }

  // Pass 1: tracker -> stereo double buffers
  function renderDry(c) {
    var n = c.dryLen, L = new Float64Array(n), R = new Float64Array(n);
    for (var ch = 0; ch < 8; ch++) {
      var I = c.ins[ch], P = c.pat[ch], on = 0, t = 0, pos = 0, rate = 0, env = 0, d = 0, g = 0, r = null, D = null;
      var pl = (127 - I.pan) / 127, pr = I.pan / 127;
      for (var row = 0; row <= c.rows; row++) {
        var e = row < c.rows ? P[row] : 255;
        if (e === 255) { if (on) { if (I.rel > 0) d = -env / I.rel; else on = 0; } }
        else if (e) {
          r = pick(I.rg, e); D = r.pcm; on = 1; pos = 0;
          rate = mexp2((e - r.unity) / 12 + r.fine / 1200) * r.rate / 44100;
          g = I.vol / 127 * mexp2(r.attn * ATT) / 32768;
          if (I.att > 0) { env = 0; d = 1 / I.att; } else { env = 1; d = 0; }
        }
        var end = row < c.rows ? t + c.rowLen : n;
        for (; t < end; t++) if (on) {
          var ip = pos | 0, nx = ip + 1, lend = r.ls + r.ll, fr = pos - ip, s0 = D[ip], s1;
          if (r.ll) { if (nx >= lend) nx -= r.ll; s1 = D[nx]; } else s1 = nx < r.len ? D[nx] : 0;
          var v = (s0 + (s1 - s0) * fr) * env * g;
          L[t] += v * pl; R[t] += v * pr;
          env += d; if (env >= 1) { env = 1; d = 0; } if (env <= 0) on = 0;
          pos += rate; if (r.ll) { while (pos >= lend) pos -= r.ll; } else if (pos >= r.len) on = 0;
        }
      }
    }
    return { L: L, R: R, n: n };
  }

  function fft(re, im, N, tab, sg) {
    for (var i = 1, j = 0; i < N; i++) {
      var b = N >> 1;
      for (; j & b; b >>= 1) j ^= b;
      j ^= b;
      if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (var len = 2; len <= N; len <<= 1) {
      var h = len >> 1, st = N / len;
      for (i = 0; i < N; i += len) for (var k = 0; k < h; k++) {
        var wr = tab[2 * k * st + N / 2], wi = sg * tab[2 * k * st], a = i + k, bb = a + h;
        var tr = re[bb] * wr - im[bb] * wi, ti = re[bb] * wi + im[bb] * wr;
        re[bb] = re[a] - tr; im[bb] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }

  // Pass 2: stereo Paulstretch. L in re, R in im of one complex FFT; independent random phases per channel.
  // Output: interleaved float32 stereo, overlap-added in place.
  function paulstretch(c, dry) {
    var N = 1 << c.win, H = N >> 1, M = 2 * N - 1, n = dry.n, L = dry.L, R = dry.R;
    var tab = new Float64Array(N * 5 / 2), re = new Float64Array(N), im = new Float64Array(N);
    for (var k = 0; k < N * 5 / 2; k++) tab[k] = msin(PI * k / N);
    var out = new Float32Array(c.outLen * 2);
    var s = c.seed >>> 0, g = c.gain / (200 * N), disp = H * 10 / c.st, o = 0;
    for (var sp = 0; sp < n; sp += disp, o += H) {
      var p = sp | 0, i, j, w;
      for (i = 0; i < N; i++) { j = p + i; w = tab[i]; re[i] = j < n ? L[j] * w : 0; im[i] = j < n ? R[j] * w : 0; }
      fft(re, im, N, tab, -1);
      re[0] = 0; im[0] = 0; re[H] = 0; im[H] = 0;
      for (k = 1; k < H; k++) {
        var k2 = N - k, ar = re[k], ai = im[k], br = re[k2], bi = im[k2];
        var a = ar + br, b = ai - bi, mL = Math.sqrt(a * a + b * b);
        a = ai + bi; b = ar - br;
        var mR = Math.sqrt(a * a + b * b);
        s = (Math.imul(s, 1103515245) + 12345) >>> 0; var q = (s >>> 8) & M, sL = tab[q], cL = tab[q + H];
        s = (Math.imul(s, 1103515245) + 12345) >>> 0; q = (s >>> 8) & M; var sR = tab[q], cR = tab[q + H];
        var x = mL * cL, y = mL * sL, u = mR * cR, v = mR * sR;
        re[k] = x - v; im[k] = y + u; re[k2] = x + v; im[k2] = u - y;
      }
      fft(re, im, N, tab, 1);
      for (i = 0; i < N; i++) { w = tab[i] * g; out[2 * (o + i)] += re[i] * w; out[2 * (o + i) + 1] += im[i] * w; }
    }
    return out;
  }

  function dryInterleaved(dry) {
    var o = new Float32Array(dry.n * 2);
    for (var i = 0; i < dry.n; i++) { o[2 * i] = dry.L[i]; o[2 * i + 1] = dry.R[i]; }
    return o;
  }

  function fnv1a(f32) {
    var u = new Uint32Array(f32.buffer, f32.byteOffset, f32.length), h = 2166136261;
    for (var i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function peak(f32) {
    var m = 0;
    for (var i = 0; i < f32.length; i++) { var a = f32[i] < 0 ? -f32[i] : f32[i]; if (a > m) m = a; }
    return m;
  }

  function wav(f32) { // 32-bit float stereo WAV
    var n = f32.length * 4, b = new ArrayBuffer(44 + n), dv = new DataView(b), o = 0;
    function s(t) { for (var i = 0; i < 4; i++) dv.setUint8(o++, t.charCodeAt(i)); }
    function u32(v) { dv.setUint32(o, v, true); o += 4; }
    function u16(v) { dv.setUint16(o, v, true); o += 2; }
    s('RIFF'); u32(36 + n); s('WAVE'); s('fmt '); u32(16); u16(3); u16(2); u32(SR); u32(SR * 8); u16(8); u16(32);
    s('data'); u32(n);
    new Float32Array(b, 44).set(f32);
    return b;
  }

  G.Engine = {
    SR: SR, msin: msin, mexp2: mexp2, pick: pick, compile: compile, attachPcm: attachPcm,
    renderDry: renderDry, paulstretch: paulstretch, dryInterleaved: dryInterleaved,
    fnv1a: fnv1a, peak: peak, wav: wav, fft: fft
  };
})(typeof window !== 'undefined' ? window : module.exports);

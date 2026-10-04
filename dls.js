// Minimal DLS level 1/2 parser (RIFF 'DLS ').
// Result: { size, bytes, ins: { id: [region...] }, names: { id: name }, drum: { id: true }, waves: [...] }
// Instrument id: GM bank 0 -> prog (0..127), GS variation -> msb*128+prog, drum kit -> 16384+prog
// region: { lo, hi, wave, unity, fine, attn, ls, ll } (ls/ll = loop start/length in samples, ll=0 -> no loop)
// wave:   { off (absolute file offset of PCM data), len (frames), rate, bits, ch, unity, fine, attn, ls, ll }
(function (G) {
  'use strict';

  function fourcc(dv, o) {
    return String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
  }

  // Iterate chunks in [start,end): cb(id, dataOffset, size, listType)
  function chunks(dv, start, end, cb) {
    var o = start;
    while (o + 8 <= end) {
      var id = fourcc(dv, o), sz = dv.getUint32(o + 4, true);
      if (id === 'LIST' || id === 'RIFF') cb(id, o + 12, sz - 4, fourcc(dv, o + 8), o);
      else cb(id, o + 8, sz, null, o);
      o += 8 + sz + (sz & 1);
    }
  }

  function readWsmp(dv, o) {
    var cb = dv.getUint32(o, true), w = {
      unity: dv.getUint16(o + 4, true),
      fine: dv.getInt16(o + 6, true),
      attn: dv.getInt32(o + 8, true),
      ls: 0, ll: 0
    };
    if (dv.getUint32(o + 16, true) > 0) {
      w.ls = dv.getUint32(o + cb + 8, true);
      w.ll = dv.getUint32(o + cb + 12, true);
    }
    return w;
  }

  function parse(buf) {
    var dv = new DataView(buf), size = buf.byteLength;
    if (size < 12 || fourcc(dv, 0) !== 'RIFF' || fourcc(dv, 8) !== 'DLS ') throw new Error('Keine DLS-Datei');
    var rawIns = [], ptbl = [], wvplStart = -1, wavesByPos = {}, waveList = [];

    chunks(dv, 12, Math.min(size, 8 + dv.getUint32(4, true)), function (id, d, sz, lt) {
      if (id === 'LIST' && lt === 'lins') {
        chunks(dv, d, d + sz, function (id2, d2, sz2, lt2) {
          if (id2 !== 'LIST' || lt2 !== 'ins ') return;
          var ins = { bank: 0, prog: 0, rgn: [], name: '' };
          chunks(dv, d2, d2 + sz2, function (id3, d3, sz3, lt3) {
            if (id3 === 'insh') { ins.bank = dv.getUint32(d3 + 4, true); ins.prog = dv.getUint32(d3 + 8, true); }
            else if (id3 === 'LIST' && lt3 === 'INFO') {
              chunks(dv, d3, d3 + sz3, function (id4, d4, sz4) {
                if (id4 !== 'INAM') return;
                for (var k = 0; k < sz4; k++) { var ch = dv.getUint8(d4 + k); if (!ch) break; ins.name += String.fromCharCode(ch); }
                ins.name = ins.name.trim();
              });
            }
            else if (id3 === 'LIST' && lt3 === 'lrgn') {
              chunks(dv, d3, d3 + sz3, function (id4, d4, sz4, lt4) {
                if (id4 !== 'LIST' || (lt4 !== 'rgn ' && lt4 !== 'rgn2')) return;
                var r = { lo: 0, hi: 127, wsmp: null, cue: -1 };
                chunks(dv, d4, d4 + sz4, function (id5, d5) {
                  if (id5 === 'rgnh') { r.lo = dv.getUint16(d5, true); r.hi = dv.getUint16(d5 + 2, true); }
                  else if (id5 === 'wsmp') r.wsmp = readWsmp(dv, d5);
                  else if (id5 === 'wlnk') r.cue = dv.getUint32(d5 + 8, true);
                });
                ins.rgn.push(r);
              });
            }
          });
          rawIns.push(ins);
        });
      } else if (id === 'ptbl') {
        var n = dv.getUint32(d + 4, true), cb = dv.getUint32(d, true);
        for (var i = 0; i < n; i++) ptbl.push(dv.getUint32(d + cb + i * 4, true));
      } else if (id === 'LIST' && lt === 'wvpl') {
        wvplStart = d;
        chunks(dv, d, d + sz, function (id2, d2, sz2, lt2, hdr2) {
          if (id2 !== 'LIST' || lt2 !== 'wave') return;
          var w = { off: 0, len: 0, rate: 22050, bits: 16, ch: 1, unity: 60, fine: 0, attn: 0, ls: 0, ll: 0 };
          chunks(dv, d2, d2 + sz2, function (id3, d3, sz3) {
            if (id3 === 'fmt ') {
              w.ch = dv.getUint16(d3 + 2, true); w.rate = dv.getUint32(d3 + 4, true); w.bits = dv.getUint16(d3 + 14, true);
            } else if (id3 === 'wsmp') {
              var s = readWsmp(dv, d3);
              w.unity = s.unity; w.fine = s.fine; w.attn = s.attn; w.ls = s.ls; w.ll = s.ll;
            } else if (id3 === 'data') { w.off = d3; w.bytes = sz3; }
          });
          w.len = Math.floor(w.bytes / Math.max(1, (w.bits >> 3) * w.ch));
          wavesByPos[hdr2 - wvplStart] = w;
          waveList.push(w);
        });
      }
    });

    // Map cue -> wave. ptbl offsets are relative to the wave pool data start; fall back to index order.
    function waveFor(cue) {
      if (cue < 0) return null;
      if (cue < ptbl.length && wavesByPos[ptbl[cue]]) return wavesByPos[ptbl[cue]];
      return waveList[cue] || null;
    }

    var out = { size: size, bytes: new Uint8Array(buf), ins: {}, names: {}, drum: {}, waves: waveList, count: rawIns.length };
    rawIns.forEach(function (ins) {
      var drum = (ins.bank & 0x80000000) !== 0, msb = (ins.bank >> 8) & 127;
      if ((ins.bank & 0x7F) !== 0 || ins.prog > 127 || (drum && msb)) return;
      var id = drum ? 16384 + ins.prog : msb * 128 + ins.prog;
      if (out.ins[id]) return;
      var list = [];
      ins.rgn.forEach(function (r) {
        var w = waveFor(r.cue);
        if (!w) return;
        var s = r.wsmp || w;
        list.push({ lo: r.lo, hi: r.hi, wave: w, unity: s.unity, fine: s.fine, attn: s.attn, ls: s.ls, ll: s.ll });
      });
      list.sort(function (a, b) { return a.lo - b.lo; });
      out.ins[id] = list;
      out.names[id] = ins.name;
      if (drum) out.drum[id] = true;
    });
    return out;
  }

  G.DLS = { parse: parse };
})(typeof window !== 'undefined' ? window : module.exports);

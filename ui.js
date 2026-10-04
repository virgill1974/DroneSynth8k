// DroneSynth8k UI: tracker, instrument editor, paulstretch panel, playback, persistence, export.
(function () {
  'use strict';
  var E = window.Engine, $ = function (id) { return document.getElementById(id); };
  var NN = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
  var NOTE_KEYS = {
    KeyZ: 0, KeyS: 1, KeyX: 2, KeyD: 3, KeyC: 4, KeyV: 5, KeyG: 6, KeyB: 7, KeyH: 8, KeyN: 9, KeyJ: 10, KeyM: 11,
    Comma: 12, KeyL: 13, Period: 14,
    KeyQ: 12, Digit2: 13, KeyW: 14, Digit3: 15, KeyE: 16, KeyR: 17, Digit5: 18, KeyT: 19, Digit6: 20, KeyY: 21,
    Digit7: 22, KeyU: 23, KeyI: 24, Digit9: 25, KeyO: 26, Digit0: 27, KeyP: 28
  };
  var LS_KEY = 'ds8k.song';

  // ---------- state ----------
  function defaultSong() {
    var s = { v: 1, bpm: 120, lpb: 4, rows: 32, pat: [], ins: [], ps: { win: 14, st: 80, seed: 1, gain: 100, df: 10 } };
    var progs = [89, 52, 48, 95, 50, 94, 35, 99];
    for (var c = 0; c < 8; c++) {
      s.pat.push(new Array(s.rows).fill(0));
      s.ins.push({ prog: progs[c], att: 300, rel: 800, vol: 100, pan: [64, 40, 88, 30, 98, 64, 64, 64][c] });
    }
    s.pat[0][0] = 48; s.pat[1][4] = 55; s.pat[2][8] = 60; s.pat[3][12] = 63; s.pat[6][0] = 36;
    [0, 1, 2, 3, 6].forEach(function (c) { s.pat[c][28] = 255; });
    return s;
  }
  function validSong(s) {
    return s && s.pat && s.pat.length === 8 && s.ins && s.ins.length === 8 && s.ps && s.rows > 0;
  }
  var song = defaultSong();
  try { var st = JSON.parse(localStorage.getItem(LS_KEY)); if (validSong(st)) song = st; } catch (e) { /* ignore */ }

  var dls = null, cur = { row: 0, ch: 0 }, oct = 4, step = 1, insSel = 0;
  var cache = { dryKey: null, dry: null, c: null, wetKey: null, wet: null, hash: null, ms: 0 };
  var actx = null, play = null;

  // ---------- helpers ----------
  function status(msg, err) { var f = $('status'); f.textContent = msg; f.className = err ? 'err' : ''; }
  function noteName(e) {
    if (!e) return '···';
    if (e === 255) return '===';
    return NN[e % 12] + (Math.floor(e / 12) - 1);
  }
  function hex2(n) { return ('0' + n.toString(16).toUpperCase()).slice(-2); }
  function clamp(v, a, b) { v = Math.round(+v); if (isNaN(v)) v = a; return v < a ? a : v > b ? b : v; }
  var saveT = 0;
  function changed() {
    clearTimeout(saveT);
    saveT = setTimeout(function () { try { localStorage.setItem(LS_KEY, JSON.stringify(song)); } catch (e) { /* ignore */ } }, 300);
    updateInfo();
  }
  function download(name, data, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: type || 'application/octet-stream' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- tracker ----------
  var tbl = $('tracker'), cells = [], trs = [];
  // sound ids: 0..127 GM, msb*128+prog GS variation, 16384+prog drum kit (see dls.js)
  function isKit(id) { return id >= 16384; }
  function soundName(id) {
    if (id < 128) return GM.NAMES[id];
    if (dls && dls.names[id]) return dls.names[id];
    return isKit(id) ? 'Kit ' + (id - 16384) : 'Var ' + (id >> 7) + ':' + (id & 127);
  }
  function insName(c) { return (c + 1) + ' ' + soundName(song.ins[c].prog); }
  function buildTracker() {
    var h = '<thead><tr><th></th>';
    for (var c = 0; c < 8; c++) h += '<th data-ch="' + c + '"></th>';
    h += '</tr></thead><tbody>';
    for (var r = 0; r < song.rows; r++) {
      h += '<tr' + (r % song.lpb === 0 ? ' class="beat"' : '') + '><td class="rn">' + hex2(r) + '</td>';
      for (c = 0; c < 8; c++) h += '<td class="c" data-r="' + r + '" data-c="' + c + '"></td>';
      h += '</tr>';
    }
    tbl.innerHTML = h + '</tbody>';
    trs = Array.prototype.slice.call(tbl.tBodies[0].rows);
    cells = trs.map(function (tr) { return Array.prototype.slice.call(tr.cells, 1); });
    for (r = 0; r < song.rows; r++) for (c = 0; c < 8; c++) drawCell(r, c);
    drawHeads();
    moveCursor(0, 0);
  }
  function drawHeads() {
    var th = tbl.tHead.rows[0].cells;
    for (var c = 0; c < 8; c++) { th[c + 1].textContent = th[c + 1].title = insName(c); th[c + 1].className = c === insSel ? 'sel' : ''; }
  }
  function drawCell(r, c) {
    var e = song.pat[c][r], td = cells[r][c];
    td.textContent = noteName(e);
    td.className = 'c' + (e === 0 ? ' e' : e === 255 ? ' off' : '') + (r === cur.row && c === cur.ch ? ' cur' : '');
  }
  function moveCursor(dr, dc, abs) {
    var o = cur, nr = abs ? dr : o.row + dr, nc = abs ? dc : o.ch + dc;
    if (trs[o.row]) { trs[o.row].classList.remove('currow'); cells[o.row][o.ch].classList.remove('cur'); }
    nr = ((nr % song.rows) + song.rows) % song.rows; nc = (nc + 8) % 8;
    cur = { row: nr, ch: nc };
    trs[nr].classList.add('currow'); cells[nr][nc].classList.add('cur');
    var wrap = $('trackerWrap'), td = cells[nr][nc], hh = tbl.tHead.offsetHeight;
    if (td.offsetTop - hh < wrap.scrollTop) wrap.scrollTop = td.offsetTop - hh;
    else if (td.offsetTop + td.offsetHeight > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = td.offsetTop + td.offsetHeight - wrap.clientHeight;
    if (nc !== insSel) selectIns(nc);
  }
  function setNote(e) {
    song.pat[cur.ch][cur.row] = e;
    drawCell(cur.row, cur.ch);
    changed();
    if (e > 0 && e < 128 && !play) preview(cur.ch, e, 0.6);
    moveCursor(step, 0);
  }
  function resizeRows(n) {
    for (var c = 0; c < 8; c++) {
      var p = song.pat[c];
      if (p.length > n) p.length = n; else while (p.length < n) p.push(0);
    }
    song.rows = n;
    buildTracker();
    changed();
  }
  tbl.addEventListener('mousedown', function (ev) {
    var td = ev.target.closest('td.c'), th = ev.target.closest('th[data-ch]');
    if (td) moveCursor(+td.dataset.r, +td.dataset.c, true);
    else if (th) moveCursor(cur.row, +th.dataset.ch, true);
  });

  document.addEventListener('keydown', function (ev) {
    var t = ev.target.tagName;
    if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') { if (ev.code === 'Escape') ev.target.blur(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var k = ev.code, done = true;
    if (k in NOTE_KEYS) setNote(clamp((oct + 1) * 12 + NOTE_KEYS[k], 1, 127));
    else if (k === 'Digit1' || k === 'Backquote' || k === 'IntlBackslash') setNote(255);
    else if (k === 'Delete' || k === 'Backspace') setNote(0);
    else if (k === 'ArrowUp') moveCursor(-1, 0);
    else if (k === 'ArrowDown') moveCursor(1, 0);
    else if (k === 'ArrowLeft') moveCursor(0, -1);
    else if (k === 'ArrowRight') moveCursor(0, 1);
    else if (k === 'Tab') moveCursor(0, ev.shiftKey ? -1 : 1);
    else if (k === 'PageUp') moveCursor(Math.max(0, cur.row - 16), cur.ch, true);
    else if (k === 'PageDown') moveCursor(Math.min(song.rows - 1, cur.row + 16), cur.ch, true);
    else if (k === 'Home') moveCursor(0, cur.ch, true);
    else if (k === 'End') moveCursor(song.rows - 1, cur.ch, true);
    else if (k === 'NumpadAdd') { oct = Math.min(8, oct + 1); $('nOct').value = oct; }
    else if (k === 'NumpadSubtract') { oct = Math.max(0, oct - 1); $('nOct').value = oct; }
    else if (k === 'Space') { if (play) stop(); else start(); }
    else done = false;
    if (done) ev.preventDefault();
  });

  // ---------- header fields ----------
  function bindNum(id, get, set, min, max) {
    var el = $(id); el.value = get();
    el.addEventListener('change', function () { var v = clamp(el.value, min, max); el.value = v; set(v); });
  }
  bindNum('nBpm', function () { return song.bpm; }, function (v) { song.bpm = v; changed(); }, 20, 999);
  bindNum('nLpb', function () { return song.lpb; }, function (v) { song.lpb = v; buildTracker(); changed(); }, 1, 16);
  bindNum('nRows', function () { return song.rows; }, resizeRows, 1, 256);
  bindNum('nOct', function () { return oct; }, function (v) { oct = v; }, 0, 8);
  bindNum('nStep', function () { return step; }, function (v) { step = v; }, 0, 16);
  function refreshHeader() {
    $('nBpm').value = song.bpm; $('nLpb').value = song.lpb; $('nRows').value = song.rows;
  }

  // ---------- parameter widgets (slider + number) ----------
  function param(parent, label, min, max, get, set, scale) {
    scale = scale || 1;
    var d = document.createElement('div'); d.className = 'param';
    d.innerHTML = '<span>' + label + '</span><input type="range"><input type="number">';
    var r = d.children[1], n = d.children[2];
    r.min = min; r.max = max; n.min = min / scale; n.max = max / scale; n.step = 1 / scale;
    function show() { var v = get(); r.value = v; n.value = scale === 1 ? v : (v / scale).toFixed(1); }
    r.addEventListener('input', function () { set(clamp(r.value, min, max)); show(); changed(); });
    n.addEventListener('change', function () { set(clamp(n.value * scale, min, max)); show(); changed(); });
    parent.appendChild(d);
    show();
    return show;
  }

  // ---------- instrument editor ----------
  var insShows = [];
  (function buildIns() {
    var sel = $('insSel');
    for (var i = 0; i < 8; i++) {
      var b = document.createElement('button'); b.textContent = i + 1; b.dataset.i = i;
      b.addEventListener('click', function () { moveCursor(cur.row, +this.dataset.i, true); });
      sel.appendChild(b);
    }
    var s = $('sProg');
    buildProgSelect();
    s.addEventListener('change', function () { song.ins[insSel].prog = +s.value; selectIns(insSel); changed(); s.blur(); });
    var P = $('insParams'), I = function () { return song.ins[insSel]; };
    insShows.push(param(P, 'ATTACK ms', 0, 10000, function () { return I().att; }, function (v) { I().att = v; }));
    insShows.push(param(P, 'RELEASE ms', 0, 10000, function () { return I().rel; }, function (v) { I().rel = v; }));
    insShows.push(param(P, 'VOLUME', 0, 127, function () { return I().vol; }, function (v) { I().vol = v; }));
    insShows.push(param(P, 'PAN', 0, 127, function () { return I().pan; }, function (v) { I().pan = v; }));
    $('bPrev').addEventListener('click', function () { preview(insSel, isKit(song.ins[insSel].prog) ? 36 : 60, 1.5); });
  })();
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function buildProgSelect() {
    var h = '', have = {};
    function opt(id, label) { have[id] = 1; return '<option value="' + id + '">' + esc(label) + '</option>'; }
    GM.CATS.forEach(function (cat, ci) {
      h += '<optgroup label="' + cat + '">';
      for (var p = ci * 8; p < ci * 8 + 8; p++) h += opt(p, ('00' + p).slice(-3) + ' ' + GM.NAMES[p]);
      h += '</optgroup>';
    });
    if (dls) {
      var ids = Object.keys(dls.ins).map(Number);
      var kits = ids.filter(isKit).sort(function (a, b) { return a - b; });
      var vars = ids.filter(function (i) { return i >= 128 && !isKit(i); })
        .sort(function (a, b) { return (a & 127) - (b & 127) || a - b; });
      if (kits.length) h += '<optgroup label="Drum Kits">' + kits.map(function (i) {
        return opt(i, ('00' + (i - 16384)).slice(-3) + ' ' + soundName(i));
      }).join('') + '</optgroup>';
      if (vars.length) h += '<optgroup label="GS Variationen">' + vars.map(function (i) {
        return opt(i, ('00' + (i & 127)).slice(-3) + '.' + (i >> 7) + ' ' + soundName(i));
      }).join('') + '</optgroup>';
    }
    var miss = song.ins.map(function (I) { return I.prog; }).filter(function (id, k, a) { return !have[id] && a.indexOf(id) === k; });
    if (miss.length) h += '<optgroup label="Im Song (gm.dls laden)">' + miss.map(function (i) { return opt(i, soundName(i)); }).join('') + '</optgroup>';
    $('sProg').innerHTML = h;
    $('sProg').value = song.ins[insSel].prog;
  }
  function selectIns(i) {
    insSel = i;
    Array.prototype.forEach.call($('insSel').children, function (b, j) { b.classList.toggle('on', j === i); });
    if (!$('sProg').querySelector('option[value="' + song.ins[i].prog + '"]')) buildProgSelect();
    $('sProg').value = song.ins[i].prog;
    $('bPrev').textContent = isKit(song.ins[i].prog) ? 'PREVIEW C-2 (KICK)' : 'PREVIEW C-4';
    insShows.forEach(function (f) { f(); });
    drawHeads();
    updateInfo();
  }

  // ---------- paulstretch panel ----------
  var psShows = [];
  (function buildPs() {
    var s = $('sWin'), h = '';
    for (var w = 10; w <= 18; w++) h += '<option value="' + w + '">' + (1 << w) + ' (' + Math.round((1 << w) / 44.1) + ' ms)</option>';
    s.innerHTML = h;
    s.addEventListener('change', function () { song.ps.win = +s.value; changed(); s.blur(); });
    var P = $('psParams'), ps = function () { return song.ps; };
    psShows.push(param(P, 'STRETCH x', 10, 1000, function () { return ps().st; }, function (v) { ps().st = v; }, 10));
    psShows.push(param(P, 'SEED', 0, 65535, function () { return ps().seed; }, function (v) { ps().seed = v; }));
    psShows.push(param(P, 'GAIN %', 0, 1000, function () { return ps().gain; }, function (v) { ps().gain = v; }));
    psShows.push(param(P, 'DIFFUSION', 0, 10, function () { return ps().df == null ? 10 : ps().df; }, function (v) { ps().df = v; }));
  })();
  function refreshPs() { $('sWin').value = song.ps.win; psShows.forEach(function (f) { f(); }); }

  function updateInfo() {
    var rowLen = Math.floor(2646000 / (song.bpm * song.lpb)), dry = song.rows * rowLen / 44100;
    $('psInfo').textContent = 'Zeile ' + rowLen + ' smp | Pattern ' + dry.toFixed(2) + ' s\nOutput ca. ' +
      (dry * song.ps.st / 10).toFixed(1) + ' s (+ Release-Nachlauf)';
    var p = song.ins[insSel].prog, rl = dls && dls.ins[p];
    $('insInfo').textContent = !dls ? 'gm.dls nicht geladen' : !rl ? 'Sound fehlt in dieser DLS' :
      isKit(p) ? 'Drum Kit: ' + rl.length + ' Samples, Tasten ' + noteName(rl[0].lo) + ' .. ' + noteName(rl[rl.length - 1].hi) +
        '\nGM-Map: C-2 Kick, D-2 Snare, F#2 HiHat zu, A#2 HiHat offen, C#3 Crash' :
      rl.length + ' Region(en): ' + rl.map(function (r) { return r.lo + '-' + r.hi; }).join(' ') + ' (Key)';
  }

  // ---------- rendering ----------
  function dryKey() { return JSON.stringify([song.bpm, song.lpb, song.rows, song.pat, song.ins]); }
  function render(wet) {
    if (!dls) throw new Error('gm.dls nicht geladen');
    var t0 = performance.now(), dk = dryKey();
    if (cache.dryKey !== dk || cache.c === null) {
      var c = E.compile(song, dls);
      E.attachPcm(c, dls);
      cache.c = c; cache.dry = E.renderDry(c); cache.dryKey = dk; cache.wetKey = null;
    }
    if (!wet) return { buf: E.dryInterleaved(cache.dry), ms: performance.now() - t0 };
    var wk = dk + JSON.stringify(song.ps);
    if (cache.wetKey !== wk) {
      var cc = E.compile(song, dls); // fresh compile for current ps params (same regions)
      cc.ins = cache.c.ins;
      cache.c = cc;
      cache.wet = E.paulstretch(cc, cache.dry);
      cache.hash = E.fnv1a(cache.wet); cache.wetKey = wk;
    }
    return { buf: cache.wet, ms: performance.now() - t0 };
  }
  function playBuffer(f32, onEnd) {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    actx.resume();
    var n = f32.length / 2, b = actx.createBuffer(2, Math.max(1, n), 44100), L = b.getChannelData(0), R = b.getChannelData(1);
    for (var i = 0; i < n; i++) { L[i] = f32[2 * i]; R[i] = f32[2 * i + 1]; }
    var src = actx.createBufferSource(); src.buffer = b; src.connect(actx.destination);
    src.onended = onEnd || null;
    src.start();
    return { src: src, t0: actx.currentTime };
  }
  function preview(ch, note, sec) {
    if (!dls) return;
    var tmp = JSON.parse(JSON.stringify(song));
    tmp.rows = 1;
    tmp.pat = tmp.pat.map(function (p, c) { return [c === ch ? note : 0]; });
    var c = E.compile(tmp, dls, { rowLen: Math.floor(44100 * sec) });
    E.attachPcm(c, dls);
    if (prevSrc) try { prevSrc.src.stop(); } catch (e) { /* ignore */ }
    prevSrc = playBuffer(E.dryInterleaved(E.renderDry(c)));
  }
  var prevSrc = null;

  function start() {
    stop();
    if (!dls) { status('Zuerst gm.dls laden (Button GM.DLS)', true); return; }
    var wet = $('cPs').checked;
    status(wet ? 'RENDERING PAULSTRETCH ...' : 'RENDERING ...');
    $('bPlay').classList.add('on');
    setTimeout(function () {
      try {
        var r = render(wet), c = cache.c;
        var p = playBuffer(r.buf, function () { if (play && play.p === p) stop(); });
        play = { p: p, wet: wet, rowLen: c.rowLen, st: c.st };
        showStatus(r, wet);
        tick();
      } catch (e) { $('bPlay').classList.remove('on'); status('Fehler: ' + e.message, true); }
    }, 30);
  }
  function showStatus(r, wet) {
    var c = cache.c, n = r.buf.length / 2;
    status((wet ? 'WET' : 'DRY') + ' | ' + (n / 44100).toFixed(1) + ' s | peak ' + E.peak(r.buf).toFixed(3) +
      (wet ? ' | hash ' + cache.hash : '') + ' | render ' + Math.round(r.ms) + ' ms' +
      (c.warn.length ? ' | ' + c.warn.join(', ') : ''), c.warn.length > 0);
  }
  function stop() {
    if (play) { try { play.p.src.stop(); } catch (e) { /* ignore */ } play = null; }
    $('bPlay').classList.remove('on');
    trs.forEach(function (tr) { tr.classList.remove('play'); });
  }
  var lastRow = -1;
  function tick() {
    if (!play) { lastRow = -1; return; }
    var smp = (actx.currentTime - play.p.t0) * 44100, pos = play.wet ? smp * 10 / play.st : smp;
    var row = Math.floor(pos / play.rowLen);
    if (row !== lastRow) {
      if (trs[lastRow]) trs[lastRow].classList.remove('play');
      if (trs[row]) trs[row].classList.add('play');
      lastRow = row;
    }
    requestAnimationFrame(tick);
  }
  $('bPlay').addEventListener('click', function () { start(); this.blur(); });
  $('bStop').addEventListener('click', function () { stop(); this.blur(); });

  // ---------- gm.dls loading + IndexedDB cache ----------
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      try {
        var o = indexedDB.open('ds8k', 1);
        o.onupgradeneeded = function () { o.result.createObjectStore('f'); };
        o.onerror = function () { rej(o.error); };
        o.onsuccess = function () {
          try {
            var q = fn(o.result.transaction('f', mode).objectStore('f'));
            q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
          } catch (e) { rej(e); }
        };
      } catch (e) { rej(e); }
    });
  }
  function setDls(buf, name, store) {
    try {
      dls = DLS.parse(buf);
      cache = { dryKey: null, dry: null, c: null, wetKey: null, wet: null, hash: null };
      var ids = Object.keys(dls.ins).map(Number), nk = ids.filter(isKit).length, ng = ids.filter(function (i) { return i < 128; }).length;
      status('gm.dls: ' + name + ' | ' + dls.size + ' Bytes | ' + ng + ' GM, ' + (ids.length - ng - nk) + ' Variationen, ' + nk + ' Drum Kits | ' + dls.waves.length + ' Waves');
      $('bDls').classList.remove('hot');
      document.body.classList.add('loaded');
      buildProgSelect(); drawHeads();
      if (store) idb('readwrite', function (s) { return s.put(buf, 'gm'); }).catch(function () { /* ignore */ });
      updateInfo();
    } catch (e) { dls = null; status('DLS-Fehler: ' + e.message, true); }
  }
  function loadFile(f) {
    var r = new FileReader();
    r.onload = function () { if (/\.json$/i.test(f.name)) loadSongText(r.result); else setDls(r.result, f.name, true); };
    if (/\.json$/i.test(f.name)) r.readAsText(f); else r.readAsArrayBuffer(f);
  }
  $('bDls').addEventListener('click', function () { $('fDls').click(); });
  $('bDls2').addEventListener('click', function () { $('fDls').click(); });
  if (!/Windows/i.test(navigator.userAgent)) $('notWin').textContent =
    'Hinweis: Dieses System scheint kein Windows zu sein. Ohne eine gm.dls aus einer Windows-Installation funktioniert das Tool nicht.';
  $('fDls').addEventListener('change', function () { if (this.files[0]) loadFile(this.files[0]); this.value = ''; });
  document.addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drag'); });
  document.addEventListener('dragleave', function () { document.body.classList.remove('drag'); });
  document.addEventListener('drop', function (e) {
    e.preventDefault(); document.body.classList.remove('drag');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  // ---------- song save/load ----------
  function loadSongText(t) {
    try {
      var s = JSON.parse(t);
      if (!validSong(s)) throw new Error('kein DroneSynth8k-Song');
      stop(); song = s; refreshAll(); changed(); status('Song geladen');
    } catch (e) { status('Song-Fehler: ' + e.message, true); }
  }
  $('bSave').addEventListener('click', function () { download('song.ds8k.json', JSON.stringify(song), 'application/json'); });
  $('bLoad').addEventListener('click', function () { $('fSong').click(); });
  $('fSong').addEventListener('change', function () { if (this.files[0]) loadFile(this.files[0]); this.value = ''; });

  // ---------- export ----------
  $('bWav').addEventListener('click', function () {
    try { var wet = $('cPs').checked, r = render(wet); showStatus(r, wet); download(wet ? 'dronesynth.wav' : 'dronesynth_dry.wav', E.wav(r.buf), 'audio/wav'); }
    catch (e) { status('Fehler: ' + e.message, true); }
  });
  $('bExport').addEventListener('click', function () {
    status('RENDERING FOR EXPORT ...');
    setTimeout(function () {
      try {
        var r = render(true);
        download('dronesynth.h', Export.cpp(cache.c, cache.hash), 'text/plain');
        showStatus(r, true);
      } catch (e) { status('Fehler: ' + e.message, true); }
    }, 30);
  });

  function refreshAll() { refreshHeader(); refreshPs(); buildTracker(); selectIns(cur.ch); }

  refreshAll();
  idb('readonly', function (s) { return s.get('gm'); }).then(function (b) {
    if (b && !dls) setDls(b, 'gm.dls (gespeichert)', false);
  }).catch(function () { /* ignore */ });

  window.DS = { // for automated tests / console use
    get song() { return song; }, setDls: setDls, render: render, get hash() { return cache.hash; }
  };
})();

// Renders test songs in Node (same engine as the web tool), writes the C++ export per song and prints hashes.
// usage: node test/verify.js <dls> <outdir>   -> prints "<name> <hash>" per song
'use strict';
var fs = require('fs'), path = require('path');
var Engine = require('../engine.js').Engine, DLS = require('../dls.js').DLS, Export = require('../export.js').Export;

var buf = fs.readFileSync(process.argv[2]), out = process.argv[3] || '.';
var dls = DLS.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));

function song(o) {
  var s = {
    bpm: 125, lpb: 4, rows: 16, pat: [],
    ins: [], ps: { win: 12, st: 40, seed: 1, gain: 100 }
  };
  for (var c = 0; c < 8; c++) { s.pat.push(new Array(s.rows).fill(0)); s.ins.push({ prog: 0, att: 10, rel: 100, vol: 100, pan: 64 }); }
  return o(s) || s;
}

var songs = {
  basic: song(function (s) { s.pat[0][0] = 60; s.pat[0][8] = 255; s.pat[1][2] = 48; s.ins[1].prog = 89; s.ins[1].pan = 20; }),
  regions: song(function (s) {
    s.rows = 32; s.pat = s.pat.map(function () { return new Array(32).fill(0); });
    [36, 55, 59, 60, 61, 72, 84, 100].forEach(function (n, i) { s.pat[i][i * 3] = n; s.pat[i][i * 3 + 7] = 255; s.ins[i].pan = i * 18; s.ins[i].att = i * 40; });
    s.ins[3].prog = 48; s.ins[5].prog = 89; s.ins[6].rel = 0; s.ps = { win: 13, st: 85, seed: 777, gain: 150 };
  }),
  edges: song(function (s) {
    s.bpm = 97; s.lpb = 3;
    s.pat[0][15] = 127; s.pat[1][0] = 1; s.pat[1][1] = 255; s.pat[1][2] = 255; s.pat[2][0] = 60; s.pat[2][1] = 62;
    s.ins[2].att = 0; s.ins[2].rel = 0; s.ins[1].prog = 48; s.ins[0].vol = 127; s.ins[0].pan = 127;
    s.ps = { win: 10, st: 10, seed: 4294967295, gain: 250 };
  }),
  bigwin: song(function (s) { s.pat[4][0] = 45; s.pat[5][4] = 64; s.ins[5].prog = 89; s.ps = { win: 15, st: 123, seed: 3, gain: 80 }; }),
  empty: song(function () {})
};

Object.keys(songs).forEach(function (name) {
  var c = Engine.compile(songs[name], dls);
  Engine.attachPcm(c, dls);
  var o = Engine.paulstretch(c, Engine.renderDry(c));
  var h = Engine.fnv1a(o);
  fs.writeFileSync(path.join(out, name + '.h'), Export.cpp(c, h));
  console.log(name, h, 'frames=' + c.outLen, 'peak=' + Engine.peak(o).toFixed(4));
});

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
    s.ps = { win: 10, st: 10, seed: 4294967295, gain: 250, df: 0 };
  }),
  bigwin: song(function (s) { s.pat[4][0] = 45; s.pat[5][4] = 64; s.ins[5].prog = 89; s.ps = { win: 15, st: 123, seed: 3, gain: 80, df: 7 }; }),
  drums: song(function (s) {
    s.ins[0].prog = 16384; s.ins[0].att = 0; s.ins[1].prog = 16384; s.ins[1].pan = 10; s.ins[2].prog = 208;
    [36, 0, 42, 0, 38, 0, 42, 37, 36, 36, 42, 0, 38, 0, 42, 60].forEach(function (n, i) { s.pat[0][i] = n; });
    s.pat[1][3] = 42; s.pat[1][11] = 38; s.pat[2][0] = 57; s.pat[2][12] = 255;
    s.ps = { win: 11, st: 25, seed: 99, gain: 120, df: 4 };
  }),
  width: song(function (s) {
    s.pat[0][0] = 60; s.pat[1][2] = 67; s.ins[1].prog = 89; s.ins[0].pan = 0; s.ins[1].pan = 127;
    s.ps = { win: 12, st: 50, seed: 5, gain: 100, df: 9, sw: 3 };
  }),
  mono: song(function (s) { s.pat[0][0] = 48; s.ps = { win: 11, st: 30, seed: 1, gain: 100, df: 10, sw: 0 }; }),
  // env false: att, rel, vol and the note-offs below must all be ignored
  noenv: song(function (s) {
    s.env = false;
    s.rows = 32; s.pat = s.pat.map(function () { return new Array(32).fill(0); });
    [36, 55, 59, 60, 61, 72, 84, 100].forEach(function (n, i) { s.pat[i][i * 3] = n; s.pat[i][i * 3 + 5] = 255; s.pat[i][i * 3 + 9] = n + 2; s.ins[i].pan = i * 18; s.ins[i].att = i * 40; s.ins[i].rel = 700; s.ins[i].vol = 20 + i * 10; });
    s.ins[3].prog = 48; s.ins[5].prog = 89; s.ps = { win: 12, st: 45, seed: 7, gain: 120, df: 8, sw: 6 };
  }),
  noenvdrums: song(function (s) {
    s.env = false;
    s.ins[0].prog = 16384; s.ins[1].prog = 16384; s.ins[1].pan = 10; s.ins[2].prog = 208; s.ins[2].rel = 300;
    [36, 0, 42, 255, 38, 0, 42, 37, 36, 36, 42, 0, 38, 255, 42, 60].forEach(function (n, i) { s.pat[0][i] = n; });
    s.pat[1][3] = 42; s.pat[1][11] = 38; s.pat[2][0] = 57; s.pat[2][12] = 255;
    s.ps = { win: 11, st: 25, seed: 99, gain: 120, df: 4 };
  }),
  noenvempty: song(function (s) { s.env = false; s.pat[0][3] = 255; }),
  empty: song(function () {})
};

// parser / kit sanity
if (!dls.drum[16384] || dls.names[208] !== 'Square Var' || dls.names[16384] !== 'TestKit') throw new Error('kit/variation parse');
var dc = Engine.compile(songs.drums, dls);
if (dc.pat[0][7] !== 0 || dc.pat[0][15] !== 0 || dc.pat[0][0] !== 36 || dc.ins[0].rg.length !== 3 || dc.warn.length) throw new Error('kit compile');

function hashOf(s) {
  var c = Engine.compile(s, dls);
  Engine.attachPcm(c, dls);
  return Engine.fnv1a(Engine.paulstretch(c, Engine.renderDry(c)));
}
// env false must sound exactly like the same song with att = rel = 0, vol = 127 and the note-offs removed
Object.keys(songs).forEach(function (name) {
  var s = songs[name];
  if (s.env !== false) return;
  var c = Engine.compile(s, dls), plain = JSON.parse(JSON.stringify(s));
  if (c.dryLen !== s.rows * c.rowLen || c.pat.some(function (p) { return p.indexOf(255) >= 0; })) throw new Error(name + ': note-off or tail left');
  delete plain.env;
  plain.pat = plain.pat.map(function (p) { return p.map(function (e) { return e === 255 ? 0 : e; }); });
  plain.ins.forEach(function (I) { I.att = 0; I.rel = 0; I.vol = 127; });
  if (hashOf(s) !== hashOf(plain)) throw new Error(name + ': differs from the plain equivalent');
  var withEnv = JSON.parse(JSON.stringify(s));
  delete withEnv.env;
  if (name !== 'noenvempty' && hashOf(s) === hashOf(withEnv)) throw new Error(name + ': option has no effect');
  var cpp = Export.cpp(c, '0'), asm = Export.asm(c, '0');
  if (/\benv\b|ds_ins|I\[/.test(cpp) || /v_env|v_d\b|ds_ins|i_iptr/.test(asm)) throw new Error(name + ': export still contains envelope code');
});

Object.keys(songs).forEach(function (name) {
  var c = Engine.compile(songs[name], dls);
  Engine.attachPcm(c, dls);
  var o = Engine.paulstretch(c, Engine.renderDry(c));
  var h = Engine.fnv1a(o);
  fs.writeFileSync(path.join(out, name + '.h'), Export.cpp(c, h));
  fs.writeFileSync(path.join(out, name + '.asm'), Export.asm(c, h));
  console.log(name, h, 'frames=' + c.outLen, 'peak=' + Engine.peak(o).toFixed(4));
});

// Builds a small synthetic DLS file (same RIFF layout as gm.dls) for verification without Windows.
// usage: node test/make-test-dls.js out.dls
'use strict';
var fs = require('fs');

function ck(id, data) {
  var pad = data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0), h = Buffer.alloc(8);
  h.write(id, 0, 'latin1'); h.writeUInt32LE(data.length, 4);
  return Buffer.concat([h, data, pad]);
}
function list(type, kids) { return ck('LIST', Buffer.concat([Buffer.from(type, 'latin1')].concat(kids))); }
function u32s(a) { var b = Buffer.alloc(a.length * 4); a.forEach(function (v, i) { b.writeInt32LE(v | 0, i * 4); }); return b; }
function wsmp(unity, fine, attn, ls, ll) {
  var b = Buffer.alloc(ll ? 36 : 20);
  b.writeUInt32LE(20, 0); b.writeUInt16LE(unity, 4); b.writeInt16LE(fine, 6); b.writeInt32LE(attn, 8);
  b.writeUInt32LE(0, 12); b.writeUInt32LE(ll ? 1 : 0, 16);
  if (ll) { b.writeUInt32LE(16, 20); b.writeUInt32LE(0, 24); b.writeUInt32LE(ls, 28); b.writeUInt32LE(ll, 32); }
  return ck('wsmp', b);
}
function wave(samples, rate, unity, fine, attn, ls, ll) {
  var fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(1, 2); fmt.writeUInt32LE(rate, 4); fmt.writeUInt32LE(rate * 2, 8);
  fmt.writeUInt16LE(2, 12); fmt.writeUInt16LE(16, 14);
  var d = Buffer.alloc(samples.length * 2);
  samples.forEach(function (v, i) { d.writeInt16LE(v, i * 2); });
  return list('wave', [ck('fmt ', fmt), wsmp(unity, fine, attn, ls, ll), ck('data', d),
    list('INFO', [ck('INAM', Buffer.from('w\0', 'latin1'))])]);
}
function rgn(lo, hi, cue, ws) {
  var h = Buffer.alloc(12); h.writeUInt16LE(lo, 0); h.writeUInt16LE(hi, 2); h.writeUInt16LE(0, 4); h.writeUInt16LE(127, 6);
  var l = Buffer.alloc(12); l.writeUInt32LE(cue, 8);
  return list('rgn ', [ck('rgnh', h)].concat(ws ? [ws] : []).concat([ck('wlnk', l)]));
}
function ins(bank, prog, regions) {
  var h = Buffer.alloc(12); h.writeUInt32LE(regions.length, 0); h.writeUInt32LE(bank >>> 0, 4); h.writeUInt32LE(prog, 8);
  return list('ins ', [ck('insh', h), list('lrgn', regions), list('lart', [])]);
}

// deterministic integer waveforms
var seed = 12345;
function rnd() { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 16) - 32768; }
var saw = [], tri = [], noise = [], pulse = [];
for (var i = 0; i < 2205; i++) saw.push(((i % 100) * 600 - 30000) | 0);
for (i = 0; i < 4410; i++) { var ph = i % 147; tri.push(((ph < 74 ? ph : 147 - ph) * 800 - 29000) | 0); }
for (i = 0; i < 11025; i++) noise.push((rnd() * (11025 - i) / 11025 / 2) | 0);
for (i = 0; i < 3000; i++) pulse.push((i % 63) < 20 ? 20000 : -12000);

var waves = [
  wave(saw, 22050, 60, 0, 0, 100, 2000),
  wave(tri, 22050, 72, -12, -655360 * 3, 147, 4116),
  wave(noise, 22050, 60, 0, 0, 0, 0),
  wave(pulse, 11025, 48, 7, 0, 63, 2835)
];
var offs = [], pos = 0;
waves.forEach(function (w) { offs.push(pos); pos += w.length; });

var insts = [
  ins(0, 0, [rgn(0, 59, 0), rgn(60, 127, 1)]),
  ins(0, 48, [rgn(0, 127, 2)]),
  ins(0, 89, [rgn(0, 127, 3, wsmp(50, 25, -655360 * 6, 63, 2835))]),
  ins(0x80000000, 0, [rgn(0, 127, 2)])
];
var colh = Buffer.alloc(4); colh.writeUInt32LE(insts.length, 0);
var ptbl = Buffer.concat([u32s([8, waves.length]), u32s(offs)]);
var body = Buffer.concat([Buffer.from('DLS ', 'latin1'), ck('colh', colh), list('lins', insts), ck('ptbl', ptbl), list('wvpl', waves)]);
fs.writeFileSync(process.argv[2] || 'test.dls', ck('RIFF', body));

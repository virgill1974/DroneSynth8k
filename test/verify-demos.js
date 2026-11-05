// Renders demos/*.ds8k.json with a real gm.dls and writes their C++ and ASM exports.
// usage: node test/verify-demos.js <gm.dls> <outdir>   -> prints "<name> <hash>" per song
// Also fails if the checked-in demo exports or demo-song.js no longer match what the current code generates.
'use strict';
var fs = require('fs'), path = require('path');
var Engine = require('../engine.js').Engine, DLS = require('../dls.js').DLS, Export = require('../export.js').Export;

var demos = path.join(__dirname, '..', 'demos');
var buf = fs.readFileSync(process.argv[2]), out = process.argv[3] || '.';
var dls = DLS.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));

function fail(msg) { console.error('FAIL ' + msg); process.exitCode = 1; }
function text(s) { return s.replace(/\r\n/g, '\n'); }

// exports are checked in only for some demos; git may have checked them out with CRLF
function checkDrift(file, generated) {
  var p = path.join(demos, file);
  if (fs.existsSync(p) && text(fs.readFileSync(p, 'latin1')) !== text(generated)) fail('demos/' + file + ' differs from the generated export');
}

fs.readdirSync(demos).filter(function (f) { return /\.ds8k\.json$/.test(f); }).sort().forEach(function (f) {
  var name = f.replace(/\.ds8k\.json$/, '');
  var song = JSON.parse(fs.readFileSync(path.join(demos, f), 'utf8'));
  song.ps.gain = Math.min(200, song.ps.gain | 0); song.ps.seed = 1; // same limits as normSong() in ui.js
  var c = Engine.compile(song, dls);
  Engine.attachPcm(c, dls);
  var o = Engine.paulstretch(c, Engine.renderDry(c));
  var h = Engine.fnv1a(o), cpp = Export.cpp(c, h), asm = Export.asm(c, h);
  fs.writeFileSync(path.join(out, name + '.h'), cpp);
  fs.writeFileSync(path.join(out, name + '.asm'), asm);
  checkDrift(name + '.h', cpp);
  checkDrift(name + '.asm', asm);
  console.log(name, h, 'frames=' + c.outLen, 'peak=' + Engine.peak(o).toFixed(4));
});

// the tool starts with demo-song.js, which must be the same song as demos/demosong.ds8k.json
var js = fs.readFileSync(path.join(__dirname, '..', 'demo-song.js'), 'utf8');
var embedded = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1));
var source = JSON.parse(fs.readFileSync(path.join(demos, 'demosong.ds8k.json'), 'utf8'));
if (JSON.stringify(embedded) !== JSON.stringify(source)) fail('demo-song.js differs from demos/demosong.ds8k.json');

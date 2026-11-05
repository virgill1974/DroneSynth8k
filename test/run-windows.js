// Bit-exactness check on Windows: JS engine vs. exported C++ (MSVC x64/x86) and ASM (NASM + MSVC linker, x86).
// usage: node test/run-windows.js      needs Node, Visual Studio with the C++ tools, and NASM
// Part 1 uses a synthetic DLS. Part 2 renders demos/ with the real gm.dls through the exports' own loader.
'use strict';
var cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');

var here = __dirname;
var GMDLS = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'drivers', 'gm.dls');
var CPP_SYNTHETIC = [['x64', ['/O2']], ['x64', ['/Od']], ['x86', ['/O2', '/arch:SSE2']], ['x86', ['/O1', '/arch:SSE2']]];
var CPP_REAL = [['x64', ['/O2']], ['x86', ['/O1', '/arch:SSE2']]];

var counts = { ok: 0, fail: 0 };
function report(ok, name, config, detail) {
  counts[ok ? 'ok' : 'fail']++;
  console.log((ok ? 'OK   ' : 'FAIL ') + name + ' [' + config + '] ' + detail);
}
function run(cmd, args, opt) {
  return cp.spawnSync(cmd, args, Object.assign({ encoding: 'latin1', maxBuffer: 1 << 26 }, opt));
}
function die(msg) { console.error(msg); process.exit(2); }

// ---------- tools ----------
function findNasm() {
  var r = run('where.exe', ['nasm']);
  if (r.status === 0) return r.stdout.split(/\r?\n/)[0];
  var found = [
    path.join(process.env.LOCALAPPDATA || '', 'bin', 'NASM', 'nasm.exe'),
    path.join(process.env.ProgramFiles || '', 'NASM', 'nasm.exe')
  ].filter(fs.existsSync)[0];
  return found || die('NASM nicht gefunden. Installieren mit: winget install --id NASM.NASM -e');
}
function findVcvars() {
  var vswhere = path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
  var r = run(vswhere, ['-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath']);
  var root = r.status === 0 && r.stdout.trim();
  return root ? path.join(root, 'VC', 'Auxiliary', 'Build', 'vcvarsall.bat') : die('Visual Studio mit C++-Tools nicht gefunden.');
}
var nasm = findNasm(), vcvars = findVcvars(), envs = {};
function msvcEnv(arch) {
  if (envs[arch]) return envs[arch];
  var r = run('cmd.exe', ['/s', '/c', '""' + vcvars + '" ' + arch + ' >nul && set"'], { windowsVerbatimArguments: true });
  if (r.status !== 0) die('vcvarsall ' + arch + ' fehlgeschlagen:\n' + r.stdout + r.stderr);
  var env = {};
  r.stdout.split(/\r?\n/).forEach(function (line) {
    var i = line.indexOf('=');
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  });
  return (envs[arch] = env);
}

// ---------- builds: each returns the exe path, or null after reporting the error ----------
function cl(dir, arch, args, name, config) {
  var r = run('cl', ['/nologo', '/fp:precise', '/EHsc', '/I' + dir].concat(args), { env: msvcEnv(arch), cwd: dir });
  if (r.status === 0) return true;
  report(false, name, config, 'build error\n' + r.stdout + r.stderr);
  return false;
}
function buildCpp(dir, name, arch, flags, shipping, config, id) {
  var base = path.join(dir, name + '_' + id), harness = path.join(here, 'main_test.cpp').replace(/\\/g, '/');
  fs.writeFileSync(base + '.cpp', (shipping ? '#define DS_TEST_SHIPPING\n' : '') + '#define SONG "' + name + '.h"\n#include "' + harness + '"\n');
  return cl(dir, arch, flags.concat(['/Fo:' + base + '.obj', '/Fe:' + base + '.exe', base + '.cpp']), name, config) ? base + '.exe' : null;
}
function buildAsm(dir, name, shipping, config) {
  var base = path.join(dir, name + '_asm'), defs = shipping ? ['-DDS_VERIFY'] : ['-DDS_NOLOAD', '-DDS_NO_PLAYER', '-DDS_VERIFY'];
  var r = run(nasm, ['-f', 'win32'].concat(defs, [path.join(dir, name + '.asm'), '-o', base + '_song.obj']));
  if (r.status !== 0) { report(false, name, config, 'nasm error\n' + r.stdout + r.stderr); return null; }
  var args = ['/O2', '/arch:SSE2'].concat(shipping ? ['/DDS_TEST_SHIPPING'] : [],
    ['/Fo:' + base + '.obj', '/Fe:' + base + '.exe', path.join(here, 'main_asm_test.cpp'), base + '_song.obj'],
    shipping ? ['winmm.lib'] : [], ['/link', '/SAFESEH:NO']);
  return cl(dir, 'x86', args, name, config) ? base + '.exe' : null;
}
function check(exe, args, name, hash, config) {
  if (!exe) return;
  var r = run(exe, args, { timeout: 600000 }), got = (r.stdout || '').trim();
  if (got === hash) report(true, name, config, got);
  else report(false, name, config, 'js=' + hash + ' exe=' + got + (r.status !== 0 ? ' exit=' + r.status : ''));
}

// ---------- JS side: prints "<name> <hash> ..." per song and writes the exports ----------
function jsHashes(script, dls, dir) {
  var r = run(process.execPath, [path.join(here, script), dls, dir]);
  process.stdout.write(r.stdout);
  if (r.status !== 0) { counts.fail++; console.log('FAIL ' + script + '\n' + r.stderr); }
  return r.stdout.split(/\r?\n/).filter(Boolean).map(function (line) { var w = line.split(' '); return { name: w[0], hash: w[1] }; });
}

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ds8k-test-'));
try {
  console.log('--- Teil 1: synthetische DLS');
  var dir = path.join(tmp, 'synthetic'), dls = path.join(tmp, 'test.dls');
  fs.mkdirSync(dir);
  var made = run(process.execPath, [path.join(here, 'make-test-dls.js'), dls]);
  if (made.status !== 0) die(made.stdout + made.stderr);
  jsHashes('verify.js', dls, dir).forEach(function (s) {
    CPP_SYNTHETIC.forEach(function (t, i) {
      var config = 'cpp ' + t[0] + ' ' + t[1].join(' ');
      check(buildCpp(dir, s.name, t[0], t[1], false, config, 'c' + i), [dls], s.name, s.hash, config);
    });
    check(buildAsm(dir, s.name, false, 'asm x87'), [dls], s.name, s.hash, 'asm x87');
  });

  console.log('--- Teil 2: echte gm.dls (eigener Loader und Player der Exporte)');
  if (!fs.existsSync(GMDLS)) console.log('UEBERSPRUNGEN: ' + GMDLS + ' nicht gefunden');
  else {
    dir = path.join(tmp, 'real');
    fs.mkdirSync(dir);
    jsHashes('verify-demos.js', GMDLS, dir).forEach(function (s) {
      CPP_REAL.forEach(function (t, i) {
        var config = 'cpp ' + t[0] + ' ' + t[1].join(' ');
        check(buildCpp(dir, s.name, t[0], t[1], true, config, 'c' + i), [], s.name, s.hash, config);
      });
      check(buildAsm(dir, s.name, true, 'asm x87'), [], s.name, s.hash, 'asm x87');
    });
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log('--- ' + counts.ok + ' OK, ' + counts.fail + ' FAIL');
process.exit(counts.fail ? 1 : 0);

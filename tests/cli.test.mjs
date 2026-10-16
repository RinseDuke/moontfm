import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures } from '../scripts/fixtures.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function cli(...args) {
  const r = spawnSync(process.execPath, ['bin/moontfm.mjs', ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.ifError(r.error);
  return r;
}
const report = r => JSON.parse(r.stdout);

test('all four commands run against actual files with text and JSON output', () => {
  for (const args of [['inspect', 'fixtures/minimal.tfm'], ['validate', 'fixtures/minimal.tfm'],
    ['glyph', 'fixtures/minimal.tfm', '0x41']]) {
    const r = cli(...args, '--json');
    assert.equal(r.status, 0, r.stderr); assert.equal(report(r).status, 'ok');
    assert.equal(report(r).command, args[0]); assert.equal(r.stderr, '');
  }
  const r = cli('glyph', 'fixtures/minimal.tfm', '65');
  assert.equal(r.status, 0); assert.match(r.stdout, /width: 524288 raw \(0.5 design-size units\)/);
  assert.match(r.stdout, /Not checked: ligature_execution_semantics_and_cycles/);
});

test('diff returns one for semantic or raw changes and zero only for identical content', () => {
  for (const file of ['wider.tfm', 'reordered.tfm']) {
    const r = cli('diff', 'fixtures/minimal.tfm', `fixtures/${file}`, '--json');
    assert.equal(r.status, 1); assert.equal(report(r).status, 'ok');
  }
  const r = cli('diff', 'fixtures/minimal.tfm', 'fixtures/minimal.tfm', '--json');
  assert.equal(r.status, 0);
});

test('invalid files return two and expose error locations and index ranges', () => {
  const r = cli('validate', 'fixtures/bad-index.tfm', '--json');
  assert.equal(r.status, 2);
  assert.deepEqual(report(r).diagnostics[0], {
    code: 'INDEX_OUT_OF_RANGE', severity: 'error', byte_offset: 32, table: 'width',
    message: 'Index 250 outside table of length 2', character_code: 65,
    expected_min: 0, expected_max: 1, actual: 250,
  });
  assert.equal(cli('inspect', 'fixtures/truncated.tfm').status, 2);
  for (const args of [['validate', 'fixtures/bad-boundary-entry.tfm'],
    ['glyph', 'fixtures/bad-boundary-entry.tfm', '65'],
    ['diff', 'fixtures/minimal.tfm', 'fixtures/bad-boundary-entry.tfm']]) {
    const boundary = cli(...args, '--json');
    assert.equal(boundary.status, 2);
    assert.equal(report(boundary).diagnostics[0].actual, 65535);
    assert.equal(report(boundary).diagnostics[0].character_code, 65);
  }
});

test('missing glyphs are successful queries with explicit exists=false', () => {
  const r = cli('glyph', 'fixtures/minimal.tfm', '66', '--json');
  assert.equal(r.status, 0); assert.equal(report(r).data.exists, false);
});

test('invalid usage, codes, options and file errors return structured JSON', () => {
  for (const args of [[], ['nope'], ['inspect'], ['diff', 'fixtures/minimal.tfm'],
    ['inspect', 'fixtures/minimal.tfm', 'extra'], ['inspect', '--oops'],
    ...['256', '-1', '65oops', '0x100', '1.5', '1e2', 'NaN'].map(c => ['glyph', 'fixtures/minimal.tfm', c])]) {
    const r = cli(...args, '--json');
    assert.equal(r.status, 3, args.join(' ')); assert.equal(report(r).diagnostics[0].code, 'USAGE');
    assert.equal(r.stderr, '');
  }
  const r = cli('inspect', 'fixtures/does-not-exist.tfm', '--json');
  assert.equal(r.status, 3); assert.equal(report(r).diagnostics[0].code, 'FILE_ERROR');
});

test('paths with spaces, Unicode and leading hyphen are supported', () => {
  const dir = mkdtempSync(join(tmpdir(), 'moontfm-'));
  try {
    const file = join(dir, '字体 sample.tfm'); writeFileSync(file, fixtures()['minimal.tfm']);
    assert.equal(cli('validate', file).status, 0);
    // After --, options are literal path components; an absolute path still works.
    assert.equal(cli('--json', 'validate', '--', file).status, 0);
    writeFileSync(join(dir, '-font.tfm'), fixtures()['minimal.tfm']);
    const leading = spawnSync(process.execPath, [join(root, 'bin/moontfm.mjs'), 'validate', '--', '-font.tfm'],
      { cwd: dir, encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.ifError(leading.error); assert.equal(leading.status, 0, leading.stderr);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('large files are read with a fixed input bound and rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'moontfm-'));
  try {
    const file = join(dir, 'large.tfm');
    const b = Buffer.alloc(1024 * 1024); fixtures()['minimal.tfm'].copy(b); writeFileSync(file, b);
    const r = cli('inspect', file, '--json');
    assert.equal(r.status, 2); assert.equal(report(r).diagnostics[0].code, 'INPUT_TOO_LARGE');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('help and version are available without inspecting a font', () => {
  assert.equal(cli('--help').status, 0); assert.match(cli('--help').stdout, /Usage:/);
  assert.equal(cli('--version').stdout.trim(), 'MoonTFM 0.1.0');
});

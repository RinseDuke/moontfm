import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('demo does not attribute an unpacked source tree to an ancestor Git repository', () => {
  const outer = mkdtempSync(join(tmpdir(), 'moontfm-demo-'));
  try {
    const init = spawnSync('git', ['init', '--quiet', outer],
      { encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.ifError(init.error);
    assert.equal(init.status, 0, init.stderr);
    const unpacked = join(outer, 'unpacked');
    for (const file of ['scripts/demo.mjs', 'bin/moontfm.mjs', 'fixtures/minimal.tfm',
      'package.json', '_build/js/release/build/cmd/main/main.js']) {
      const destination = join(unpacked, file);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(join(root, file), destination);
    }
    const run = spawnSync(process.execPath, ['scripts/demo.mjs', '--case', 'glyph', '--json'],
      { cwd: unpacked, encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(run.stdout);
    assert.equal(report.passed, 1);
    assert.equal(report.git_commit, null);
    assert.equal(report.git_dirty, null);
    assert.equal(JSON.parse(readFileSync(join(unpacked, 'artifacts/demo/report.json'), 'utf8')).git_dirty, null);
  } finally {
    rmSync(outer, { recursive: true, force: true });
  }
});

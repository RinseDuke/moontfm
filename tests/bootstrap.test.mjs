import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const scenario of ['compiler-version', 'core-version', 'replace-stale-core',
  'wrong-archive-preserves-core', 'corrupt-archive-preserves-core', 'fresh-install']) {
  test(`Windows bootstrap: ${scenario}`, { skip: process.platform !== 'win32' }, () => {
    const r = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-File',
      'tests/bootstrap-cases.ps1', '-Scenario', scenario],
    { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    assert.ifError(r.error);
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, new RegExp(`PASS: ${scenario}`));
  });
}

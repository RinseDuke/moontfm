// Optional development check: requires TeXware, never a runtime dependency.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import * as engine from '../_build/js/release/build/cmd/main/main.js';

const [tftopl = 'tftopl', pltotf = 'pltotf', corpusDir] = process.argv.slice(2);
const dest = resolve('artifacts/crosscheck');
mkdirSync(dest, { recursive: true });
const run = (command, args) => {
  const r = spawnSync(command, args, { encoding: 'utf8', timeout: 20000, windowsHide: true });
  assert.ifError(r.error);
  assert.equal(r.status, 0, `${command}: ${r.stdout}\n${r.stderr}`);
  return { stdout: r.stdout, stderr: r.stderr };
};
const version = run(tftopl, ['--version']).stdout.trim();
const pltotfVersion = run(pltotf, ['--version']).stdout.trim();
const generated = join(dest, 'reference.tfm');
const generation = run(pltotf, [resolve('fixtures/reference.pl'), generated]);

// Read the reference tool's PL syntax, independently from our TFM implementation.
function parsePL(text) {
  const tokens = text.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  function list() {
    assert.equal(tokens[i++], '(');
    const values = [];
    while (i < tokens.length && tokens[i] !== ')') values.push(tokens[i] === '(' ? list() : tokens[i++]);
    assert.equal(tokens[i++], ')');
    return values;
  }
  const result = [];
  while (i < tokens.length) result.push(list());
  return result;
}
const number = (base, digits) => base === 'R' ? Number(digits) : parseInt(digits, base === 'O' ? 8 : 10);
const results = [];
const inputs = [generated];
if (corpusDir) inputs.push(...readdirSync(corpusDir).filter(f => f.endsWith('.tfm')).sort().map(f => resolve(corpusDir, f)));
let totalCharacters = 0;
let maxRawRoundingError = 0;
for (const input of inputs) {
  const name = input.replaceAll('\\', '/').split('/').pop();
  const plFile = join(dest, `${name}.pl`);
  const diagnosticOutput = run(tftopl, ['--charcode-format=octal', input, plFile]);
  const pl = parsePL(readFileSync(plFile, 'utf8'));
  const bytes = readFileSync(input);
  const report = JSON.parse(engine.inspect_json(bytes));
  assert.equal(report.status, 'ok', `${name}: ${JSON.stringify(report.diagnostics)}`);
  const design = pl.find(x => x[0] === 'DESIGNSIZE');
  assert(Math.abs(number(design[1], design[2]) * 1048576 - report.data.header[1]) <= 1, `${name}: design size`);
  const checksum = pl.find(x => x[0] === 'CHECKSUM');
  assert.equal(number(checksum[1], checksum[2]) >>> 0, report.data.header[0] >>> 0, `${name}: checksum`);
  const chars = new Map(pl.filter(x => x[0] === 'CHARACTER').map(x => [number(x[1], x[2]), x.slice(3)]));
  for (let code = 0; code < 256; code++) {
    const g = JSON.parse(engine.glyph_json(bytes, code)).data;
    assert.equal(g.exists, chars.has(code), `${name}: character ${code} existence`);
    if (!g.exists) continue;
    for (const [key, label] of [['width', 'CHARWD'], ['height', 'CHARHT'], ['depth', 'CHARDP'], ['italic', 'CHARIC']]) {
      const node = chars.get(code).find(x => x[0] === label);
      const raw = node ? number(node[1], node[2]) * 1048576 : 0;
      const error = Math.abs(raw - g.metrics[key]);
      maxRawRoundingError = Math.max(maxRawRoundingError, error);
      assert(error <= 1, `${name}: character ${code} ${key}: PL ${raw}, MoonTFM ${g.metrics[key]}`);
    }
    totalCharacters++;
  }
  results.push({ name, sha256: createHash('sha256').update(bytes).digest('hex'), characters: chars.size,
    moon_diagnostics: report.diagnostics, reference_output: diagnosticOutput });
}

const ref = readFileSync(generated);
const refReport = JSON.parse(engine.inspect_json(ref));
const B = JSON.parse(engine.glyph_json(ref, 66)).data;
assert.equal(B.exists, true);
assert.deepEqual(B.metrics, { width: 0, height: 655360, depth: -131072, italic: 65536 });
assert.deepEqual(refReport.data.kerns, [-65536]);
assert.equal(refReport.data.extensibles.length, 1);

// Keep the reference tool's correction messages on intentionally broken files.
const malformed = [];
for (const name of ['bad-index.tfm', 'truncated.tfm']) {
  const r = spawnSync(tftopl, [resolve('fixtures', name), join(dest, `${name}.pl`)], { encoding: 'utf8', timeout: 20000, windowsHide: true });
  assert.ifError(r.error);
  malformed.push({ name, reference_exit: r.status, stdout: r.stdout, stderr: r.stderr,
    moon_report: JSON.parse(engine.inspect_json(readFileSync(resolve('fixtures', name)))) });
}
const summary = { schema_version: 1, toolchain: { tftopl: version, pltotf: pltotfVersion },
  generated_from: 'fixtures/reference.pl', generation, files: results.length, characters: totalCharacters,
  tolerance_raw_units: 1, max_raw_rounding_error: maxRawRoundingError, results, malformed };
writeFileSync(join(dest, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ files: results.length, characters: totalCharacters,
  max_raw_rounding_error: maxRawRoundingError, report: 'artifacts/crosscheck/summary.json' }, null, 2));

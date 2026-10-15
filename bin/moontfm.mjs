#!/usr/bin/env node
import { openSync, readSync, closeSync } from 'node:fs';

const help = `MoonTFM 0.1.0 — classic 8-bit TeX font metrics
Usage:
  node bin/moontfm.mjs inspect FILE [--json]
  node bin/moontfm.mjs validate FILE [--json]
  node bin/moontfm.mjs glyph FILE CODE [--json]
  node bin/moontfm.mjs diff BEFORE AFTER [--json]
CODE: decimal 0..255 or hexadecimal 0x00..0xff (font encoding, not Unicode).
Use -- before a file name beginning with a hyphen.
Exit codes: 0 success/equal; 1 diff found changes; 2 invalid TFM;
            3 usage or file error; 4 build/runtime error.
Validation covers declared structure/references, not complete TeX compatibility.`;

function fail(code, message, command, json, exitCode) {
  const report = { schema_version: 1, command, status: 'error',
    diagnostics: [{ code, severity: 'error', byte_offset: null, table: 'input',
      message, character_code: null, expected_min: null, expected_max: null, actual: null }],
    coverage: [], not_covered: [], data: null };
  (json ? console.log : console.error)(json ? JSON.stringify(report) : `${code}: ${message}`);
  process.exitCode = exitCode;
}

// Bound allocation even when the input is huge or grows while being read.
function readInput(file) {
  const fd = openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(131069);
    let count = 0;
    while (count < buffer.length) {
      const n = readSync(fd, buffer, count, buffer.length - count, null);
      if (n === 0) break;
      count += n;
    }
    return buffer.subarray(0, count);
  } finally { closeSync(fd); }
}

function textReport(r) {
  const lines = [`${r.command}: ${r.status}`];
  for (const d of r.diagnostics) {
    lines.push(`${d.severity} ${d.code} at byte ${d.byte_offset} [${d.table}]: ${d.message}`);
  }
  const data = r.data;
  if (data?.lengths) {
    const count = data.characters.filter(c => c.width_index !== 0).length;
    lines.push(`Design size: ${data.header[1] / 1048576} pt (raw ${data.header[1]})`,
      `Checksum: ${data.header[0] >>> 0} (identifier)`,
      `Character range: ${data.lengths[2]}..${data.lengths[3]}; ${count} present`,
      `Words: ${data.lengths[0]}; lig/kern: ${data.lig_kern.length}; kerns: ${data.kerns.length}`);
  } else if (data && 'exists' in data) {
    lines.push(`Character ${data.character_code}: ${data.exists ? 'present' : 'missing'}`);
    if (data.metrics) for (const [key, raw] of Object.entries(data.metrics)) {
      lines.push(`${key}: ${raw} raw (${raw / 1048576} design-size units)`);
    }
  } else if (data?.glyph_changes) {
    lines.push(`Character metrics and design size equal: ${data.metrics_equal}`,
      `Design size raw: ${data.design_size_before} -> ${data.design_size_after}`);
    for (const c of data.glyph_changes) {
      lines.push(`Character ${c.character_code} ${c.kind}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
    }
    lines.push(`Other/raw changes: ${data.other_changes.join(', ') || 'none'}`);
  }
  if (data?.input) lines.push(`Invalid input: ${data.input}`);
  lines.push(`Not checked: ${r.not_covered.join(', ')}`);
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return console.log(help);
  if (args.length === 1 && args[0] === '--version') return console.log('MoonTFM 0.1.0');
  let json = false;
  let literal = false;
  const positionals = [];
  for (const arg of args) {
    if (!literal && arg === '--') { literal = true; continue; }
    if (!literal && arg === '--json') { json = true; continue; }
    if (!literal && arg.startsWith('-')) {
      return fail('USAGE', `Unknown option: ${arg}`, args[0] ?? '', args.includes('--json'), 3);
    }
    positionals.push(arg);
  }
  const [command, ...files] = positionals;
  const arity = { inspect: 1, validate: 1, glyph: 2, diff: 2 };
  if (!Object.hasOwn(arity, command ?? '') || files.length !== arity[command]) {
    return fail('USAGE', help, command ?? '', json, 3);
  }
  let code;
  if (command === 'glyph') {
    if (!/^(?:\d{1,3}|0x[\da-fA-F]{1,2})$/.test(files[1]) || Number(files[1]) > 255) {
      return fail('USAGE', 'CODE must be a byte: decimal 0..255 or hex 0x00..0xff', command, json, 3);
    }
    code = Number(files[1]);
  }
  let before, after;
  try {
    before = readInput(files[0]);
    if (command === 'diff') after = readInput(files[1]);
  } catch (err) { return fail('FILE_ERROR', err.message, command, json, 3); }
  let engine;
  try { engine = await import('../_build/js/release/build/cmd/main/main.js'); }
  catch (err) { return fail('BUILD_REQUIRED', `Run moon build --target js --release first. ${err.message}`, command, json, 4); }
  const r = JSON.parse(command === 'diff' ? engine.diff_json(before, after)
    : command === 'glyph' ? engine.glyph_json(before, code) : engine.inspect_json(before));
  r.command = command;
  console.log(json ? JSON.stringify(r) : textReport(r));
  process.exitCode = r.status === 'invalid' ? 2
    : command === 'diff' && (!r.data.metrics_equal || r.data.other_changes.length > 0) ? 1 : 0;
}

main().catch(err => fail('INTERNAL_ERROR', err.message, 'runtime', process.argv.includes('--json'), 4));

import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../_build/js/release/build/cmd/main/main.js';
import { fixture, fixtures } from '../scripts/fixtures.mjs';

const inspect = bytes => JSON.parse(engine.inspect_json(bytes));
const glyph = (bytes, code) => JSON.parse(engine.glyph_json(bytes, code));
const diff = (a, b) => JSON.parse(engine.diff_json(a, b));
const samples = fixtures();
const has = (report, code) => report.diagnostics.some(d => d.code === code);

test('known binary fields and fixed-point values match independent expectations', () => {
  const r = inspect(samples['minimal.tfm']);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.data.lengths, [15, 2, 65, 65, 2, 2, 1, 1, 0, 0, 0, 0]);
  assert.deepEqual(r.data.header, [0x12345678, 10485760]);
  assert.deepEqual(glyph(samples['minimal.tfm'], 65).data.metrics,
    { width: 524288, height: 734003, depth: 0, italic: 0 });
});

test('every truncated prefix reports the exact end without reading past the input', () => {
  const b = samples['minimal.tfm'];
  for (let i = 0; i < b.length; i++) {
    const r = inspect(b.subarray(0, i));
    assert.equal(r.status, 'invalid', `prefix ${i}`);
    assert.equal(r.diagnostics[0].code, 'TRUNCATED');
    assert.equal(r.diagnostics[0].byte_offset, i);
  }
});

test('trailing data and inconsistent directory length are distinguished', () => {
  const b = Buffer.from(samples['minimal.tfm']);
  assert(has(inspect(Buffer.concat([b, Buffer.from([0])])), 'TRAILING_DATA'));
  b.writeUInt16BE(16, 0);
  assert(has(inspect(b), 'LENGTH_SUM'));
});

test('invalid and unsupported directory fields are rejected before allocation', () => {
  for (let i = 0; i < 12; i++) {
    const b = Buffer.from(samples['minimal.tfm']); b.writeUInt16BE(0xffff, i * 2);
    assert(has(inspect(b), 'UNSUPPORTED_OR_INVALID_FORMAT'));
  }
  const b = Buffer.from(samples['minimal.tfm']);
  b.writeUInt16BE(9, 0); assert(has(inspect(b), 'UNSUPPORTED_OR_INVALID_FORMAT'));
  b.writeUInt16BE(11, 0); assert(has(inspect(b), 'UNSUPPORTED_OR_INVALID_FORMAT'));
  b.writeUInt16BE(15, 0); b.writeUInt16BE(0, 2); assert(has(inspect(b), 'HEADER_TOO_SHORT'));
  assert(has(inspect(fixture({ bc: 256 })), 'CHARACTER_RANGE'));
  assert(has(inspect(fixture({ exten: Array(257).fill([0, 0, 0, 65]) })), 'TABLE_SIZE'));
});

test('canonical empty and sparse character ranges are valid', () => {
  assert.equal(inspect(samples['empty.tfm']).status, 'ok');
  const b = fixture({ bc: 0, chars: [[0, 0, 0, 0], [1, 0x10, 0, 0]] });
  assert.equal(glyph(b, 0).data.exists, false);
  assert.equal(glyph(b, 1).data.exists, true);
  const all = fixture({ bc: 0, chars: Array(256).fill([1, 0, 0, 0]) });
  assert.equal(inspect(all).status, 'ok');
  assert.equal(glyph(all, 255).data.exists, true);
});

test('zero-width present glyphs are distinct from missing glyphs', () => {
  const r = glyph(samples['zero-width.tfm'], 65);
  assert.equal(r.data.exists, true); assert.equal(r.data.metrics.width, 0);
  assert.deepEqual(glyph(samples['zero-width.tfm'], 66).data,
    { character_code: 66, exists: false, metrics: null });
  assert.equal(glyph(samples['minimal.tfm'], -1).status, 'invalid');
  assert.equal(glyph(samples['minimal.tfm'], 256).status, 'invalid');
});

test('all metric index classes report location, character, range and actual index', () => {
  for (const [byte, value, table, actual, max] of [
    [0, 250, 'width', 250, 1], [1, 0xf0, 'height', 15, 1],
    [1, 0x1f, 'depth', 15, 0], [2, 0xfc, 'italic', 63, 0],
  ]) {
    const b = Buffer.from(samples['minimal.tfm']); b[32 + byte] = value;
    const r = inspect(b); const d = r.diagnostics.find(d => d.table === table);
    assert.equal(r.status, 'invalid');
    assert.equal(d.byte_offset, 32 + byte); assert.equal(d.character_code, 65);
    assert.equal(d.actual, actual); assert.equal(d.expected_max, max);
    assert.equal(glyph(b, 65).status, 'invalid');
  }
});

test('signed depth and kern, negative width and slant exception retain exact integers', () => {
  assert.equal(inspect(samples['negative.tfm']).status, 'ok');
  assert.equal(glyph(samples['negative.tfm'], 65).data.metrics.depth, -131072);
  assert.deepEqual(inspect(samples['negative.tfm']).data.kerns, [-65536]);
  const b = fixture({ widths: [0, -1], params: [-2147483648, -1] });
  assert.equal(inspect(b).status, 'ok');
  assert.equal(glyph(b, 65).data.metrics.width, -1);
});

test('design-size and dimension boundaries, zero origins and empty tables', () => {
  assert.equal(inspect(fixture({ header: [-1, 1048576] })).status, 'ok');
  assert(has(inspect(fixture({ header: [0, 1048575] })), 'DESIGN_SIZE'));
  assert(has(inspect(fixture({ widths: [1, 524288] })), 'NONZERO_ORIGIN'));
  assert(has(inspect(fixture({ widths: [] })), 'EMPTY_METRIC_TABLE'));
  for (const v of [-16777216, 16777215]) assert.equal(inspect(fixture({ widths: [0, v] })).status, 'ok');
  for (const v of [-16777217, 16777216]) assert(has(inspect(fixture({ widths: [0, v] })), 'DIMENSION_RANGE'));
  assert(has(inspect(fixture({ params: [0, 16777216] })), 'DIMENSION_RANGE'));
});

test('BCPL length checks apply only when full optional header field is available', () => {
  const header = Array(18).fill(0); header[1] = 10485760;
  header[2] = 40 << 24; header[12] = 20 << 24;
  const ds = inspect(fixture({ header })).diagnostics;
  assert.deepEqual(ds.map(d => [d.code, d.byte_offset]), [['BCPL_LENGTH', 32], ['BCPL_LENGTH', 72]]);
});

test('lig/kern entry, skip, restart and kern indices are bounded', () => {
  assert(has(inspect(fixture({ chars: [[1, 0x10, 1, 0]] })), 'INDEX_OUT_OF_RANGE'));
  for (const r of [[0, 65, 128, 0], [129, 0, 0, 9], [128, 65, 128, 1]]) {
    assert(has(inspect(fixture({ lig: [r], kerns: [-65536] })), 'INDEX_OUT_OF_RANGE'));
  }
  const good = fixture({ chars: [[1, 0x10, 1, 0]], lig: [[129, 0, 0, 1], [128, 65, 128, 0]], kerns: [-65536] });
  assert.equal(inspect(good).status, 'ok');
});

test('boundary controls are not treated as ligatures or kern records', () => {
  const lig = [[255, 250, 255, 255], [128, 250, 128, 0], [255, 0, 0, 1]];
  assert.equal(inspect(fixture({ lig, kerns: [-1] })).status, 'ok');
  // A one-entry table declares both right and left boundaries.
  assert.equal(inspect(fixture({ lig: [[255, 250, 0, 0]] })).status, 'ok');
  assert(has(inspect(fixture({ lig: [[255, 250, 0, 1]] })), 'INDEX_OUT_OF_RANGE'));
});

test('missing ligature operands and results are diagnosed', () => {
  const r = inspect(fixture({ lig: [[128, 66, 0, 67]] }));
  assert.equal(r.diagnostics.filter(d => d.code === 'MISSING_CHARACTER').length, 2);
  assert(has(inspect(fixture({ lig: [[128, 65, 4, 65]] })), 'LIGATURE_OPCODE'));
});

test('extensible optional zero pieces and mandatory repeat references differ', () => {
  assert.equal(inspect(samples['recipe.tfm']).status, 'ok');
  assert(has(inspect(fixture({ chars: [[1, 0x10, 3, 1]], exten: [[0, 0, 0, 65]] })), 'INDEX_OUT_OF_RANGE'));
  assert(has(inspect(fixture({ exten: [[0, 0, 0, 0]] })), 'MISSING_CHARACTER'));
  assert.equal(inspect(fixture({ bc: 0, exten: [[0, 0, 0, 0]] })).status, 'ok');
});

test('next-larger missing targets and cycles are bounded; valid chains pass', () => {
  assert(has(inspect(fixture({ chars: [[1, 0x10, 2, 66]] })), 'MISSING_CHARACTER'));
  assert(has(inspect(fixture({ chars: [[1, 0x10, 2, 65]] })), 'NEXT_LARGER_CYCLE'));
  assert(has(inspect(fixture({ chars: [[1, 0x10, 2, 66], [1, 0x10, 2, 65]] })), 'NEXT_LARGER_CYCLE'));
  assert.equal(inspect(fixture({ chars: [[1, 0x10, 2, 66], [1, 0x10, 0, 0]] })).status, 'ok');
});

test('semantic diff has exact changed, added and removed glyphs', () => {
  const base = samples['minimal.tfm'];
  const wider = diff(base, samples['wider.tfm']).data;
  assert.equal(wider.metrics_equal, false);
  assert.equal(wider.glyph_changes.length, 1);
  assert.equal(wider.glyph_changes[0].character_code, 65);
  assert.equal(wider.glyph_changes[0].kind, 'changed');
  assert.equal(wider.glyph_changes[0].before.width, 524288);
  assert.equal(wider.glyph_changes[0].after.width, 655360);
  const moved = diff(base, fixture({ bc: 66 })).data;
  assert.deepEqual(moved.glyph_changes.map(c => [c.character_code, c.kind]), [[65, 'removed'], [66, 'added']]);
});

test('table reordering is metric-equivalent while raw changes remain visible', () => {
  const r = diff(samples['minimal.tfm'], samples['reordered.tfm']).data;
  assert.equal(r.metrics_equal, true); assert.deepEqual(r.glyph_changes, []);
  assert.deepEqual(r.other_changes, ['char_info', 'width_table']);
});

test('design-size changes are separate from relative metrics; checksum is only an identifier', () => {
  const base = samples['minimal.tfm'];
  const r = diff(base, fixture({ header: [0x12345678, 12 * 1048576] })).data;
  assert.equal(r.metrics_equal, false); assert.deepEqual(r.glyph_changes, []);
  assert.equal(r.design_size_after, 12 * 1048576);
  const changed = diff(base, fixture({ header: [-1, 10 * 1048576] })).data;
  assert.equal(changed.metrics_equal, true); assert(changed.other_changes.includes('checksum'));
});

test('non-metric changes and identical input are reported without font equivalence claims', () => {
  const base = samples['minimal.tfm'];
  const identical = diff(base, base).data;
  assert.equal(identical.metrics_equal, true); assert.deepEqual(identical.other_changes, []);
  for (const [options, table] of [[{ params: [0] }, 'parameters'], [{ kerns: [-1] }, 'kern'],
    [{ lig: [[128, 65, 0, 65]] }, 'lig_kern'], [{ exten: [[0, 0, 0, 65]] }, 'exten']]) {
    const r = diff(base, fixture(options)).data;
    assert.equal(r.metrics_equal, true); assert(r.other_changes.includes(table));
  }
});

test('invalid diff identifies which input failed and never emits an equivalence result', () => {
  for (const bad of [samples['truncated.tfm'], samples['bad-index.tfm']]) {
    assert.deepEqual(diff(bad, samples['minimal.tfm']).data, { input: 'before' });
    assert.deepEqual(diff(samples['minimal.tfm'], bad).data, { input: 'after' });
  }
});

test('JSON schema exposes validation coverage and preserves integer values', () => {
  const r = inspect(samples['minimal.tfm']);
  assert.deepEqual(Object.keys(r).sort(), ['command', 'coverage', 'data', 'diagnostics', 'not_covered', 'schema_version', 'status']);
  assert.equal(r.schema_version, 1);
  assert(r.not_covered.includes('ligature_execution_semantics_and_cycles'));
  assert(r.coverage.includes('metric_indices'));
  assert.equal(engine.inspect_json(samples['minimal.tfm']), engine.inspect_json(samples['minimal.tfm']));
});

test('deterministic mutations and random bytes always produce bounded structured reports', () => {
  let seed = 0x12345678;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  for (let i = 0; i < 1500; i++) {
    const b = i < 750 ? Buffer.from(samples['minimal.tfm']) : Buffer.alloc(random() % 512);
    if (i < 750) { for (let j = 0; j < 3; j++) b[random() % b.length] = random() & 255; }
    else for (let j = 0; j < b.length; j++) b[j] = random() & 255;
    const r = inspect(b);
    assert(['ok', 'invalid'].includes(r.status));
    assert(r.diagnostics.length < 100000);
    for (const d of r.diagnostics) assert(d.byte_offset >= 0 && d.byte_offset <= b.length);
  }
});

test('maximum classic TFM length is bounded before parsing or allocation', () => {
  assert(has(inspect(Buffer.alloc(131069)), 'INPUT_TOO_LARGE'));
  const header = Array(32757).fill(0); header[1] = 10485760;
  const maximum = fixture({ header, bc: 1, chars: [], widths: [0], heights: [0] });
  assert.equal(maximum.length, 131068);
  assert.equal(inspect(maximum).status, 'ok');
});

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const cases = [
  { id: 'inspect', title: '读取正常字体', args: ['inspect', 'fixtures/minimal.tfm'], exit: 0,
    expected: { status: 'ok', 'data.lengths.0': 15, 'data.header.1': 10485760,
      'data.characters.0.code': 65, 'diagnostics.length': 0 } },
  { id: 'glyph', title: '查询字符 65 的度量', args: ['glyph', 'fixtures/minimal.tfm', '65'], exit: 0,
    expected: { status: 'ok', 'data.exists': true,
      'data.metrics': { width: 524288, height: 734003, depth: 0, italic: 0 } } },
  { id: 'bad-index', title: '定位损坏的宽度索引', args: ['validate', 'fixtures/bad-index.tfm'], exit: 2,
    expected: { status: 'invalid', 'diagnostics.0.code': 'INDEX_OUT_OF_RANGE',
      'diagnostics.0.byte_offset': 32, 'diagnostics.0.character_code': 65,
      'diagnostics.0.actual': 250, 'diagnostics.0.expected_min': 0, 'diagnostics.0.expected_max': 1 } },
  { id: 'bad-lig-entry', title: '定位连字入口越界', args: ['validate', 'fixtures/bad-boundary-entry.tfm'], exit: 2,
    expected: { status: 'invalid', 'diagnostics.0.code': 'INDEX_OUT_OF_RANGE',
      'diagnostics.0.byte_offset': 62, 'diagnostics.0.character_code': 65,
      'diagnostics.0.actual': 65535, 'diagnostics.0.expected_max': 1 } },
  { id: 'width-change', title: '比较实际宽度变化', args: ['diff', 'fixtures/minimal.tfm', 'fixtures/wider.tfm'], exit: 1,
    expected: { status: 'ok', 'data.metrics_equal': false, 'data.glyph_changes.length': 1,
      'data.glyph_changes.0.character_code': 65, 'data.glyph_changes.0.kind': 'changed',
      'data.glyph_changes.0.before.width': 524288, 'data.glyph_changes.0.after.width': 655360 } },
  { id: 'table-reorder', title: '区分表变化和实际度量变化', args: ['diff', 'fixtures/minimal.tfm', 'fixtures/reordered.tfm'], exit: 1,
    expected: { status: 'ok', 'data.metrics_equal': true, 'data.glyph_changes': [],
      'data.other_changes': ['char_info', 'width_table'] } },
  { id: 'zero-width', title: '确认零宽字符仍然存在', args: ['glyph', 'fixtures/zero-width.tfm', '65'], exit: 0,
    expected: { status: 'ok', 'data.exists': true, 'data.metrics.width': 0 } },
  { id: 'missing', title: '查询不存在的字符', args: ['glyph', 'fixtures/minimal.tfm', '66'], exit: 0,
    expected: { status: 'ok', 'data.exists': false, 'data.metrics': null } },
];

function run(args) {
  const result = spawnSync(process.execPath, [join(root, 'bin/moontfm.mjs'), ...args],
    { cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true });
  return { exit_code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '',
    process_error: result.error?.message ?? null };
}

function check(field, expected, actual) {
  // Keep undefined visible in the saved JSON instead of silently dropping it.
  return { field, expected, actual: actual === undefined ? { missing: true } : actual,
    matches: isDeepStrictEqual(actual, expected) };
}

function execute(item) {
  const jsonRun = run([...item.args, '--json']);
  const textRun = run(item.args);
  let report = null;
  let parseError = null;
  try { report = JSON.parse(jsonRun.stdout); } catch (error) { parseError = error.message; }
  const checks = [check('json.exit_code', item.exit, jsonRun.exit_code),
    check('text.exit_code', item.exit, textRun.exit_code), check('json.process_error', null, jsonRun.process_error),
    check('text.process_error', null, textRun.process_error), check('json.parse_error', null, parseError)];
  for (const [field, expected] of Object.entries(item.expected)) {
    const actual = field.split('.').reduce((value, key) => value?.[key], report);
    checks.push(check(field, expected, actual));
  }
  const inputs = item.args.filter(arg => arg.endsWith('.tfm')).map(file => ({ file,
    sha256: createHash('sha256').update(readFileSync(join(root, file))).digest('hex') }));
  return { id: item.id, title: item.title, command: `node bin/moontfm.mjs ${item.args.join(' ')}`,
    expected_exit_code: item.exit, matches: checks.every(value => value.matches), inputs,
    checks, text_run: textRun, json_run: jsonRun, report };
}

function markdown(summary) {
  const lines = ['# MoonTFM 实际运行验收报告', '', `执行时间（UTC）：${summary.executed_at}`,
    `源码提交：${summary.git_commit ?? '无 Git 信息'}；工作区有未提交修改：${summary.git_dirty ?? '未知'}`,
    `编译产物 SHA-256：${summary.engine_sha256}`, '',
    `结果：${summary.passed}/${summary.total} 项符合预期。`, '',
    '损坏输入退出 2、发现差异退出 1 均属于本演示的预期业务结果；演示脚本自身只在检查不符时退出 1。', '',
    '以下文本和 JSON 来自实际子进程，不是预先编写的示意输出。数值与字段检查见同目录 report.json。', ''];
  for (const item of summary.cases) {
    lines.push(`## ${item.title}（${item.id}）`, '', `检查：${item.matches ? '符合预期' : '不符合预期'}`,
      `预期退出码：${item.expected_exit_code}；实际退出码：${item.text_run.exit_code}`, '',
      '```text', item.command, item.text_run.stdout.trimEnd(), '```', '',
      '实际 JSON：', '', '```json', item.json_run.stdout.trimEnd(), '```', '');
    if (item.text_run.stderr) lines.push('stderr：', '```text', item.text_run.stderr.trimEnd(), '```', '');
    for (const failure of item.checks.filter(value => !value.matches)) {
      lines.push(`- ${failure.field}：预期 ${JSON.stringify(failure.expected)}；实际 ${JSON.stringify(failure.actual)}`);
    }
  }
  return lines.join('\n') + '\n';
}

function gitMetadata() {
  const options = { cwd: root, encoding: 'utf8', windowsHide: true };
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], options);
  // A source archive may live inside an unrelated checkout. Do not attribute it
  // to that ancestor's commit or working tree.
  if (top.status !== 0 || realpathSync(top.stdout.trim()) !== realpathSync(root)) {
    return { git_commit: null, git_dirty: null };
  }
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], options);
  const dirty = spawnSync('git', ['status', '--porcelain'], options);
  return { git_commit: commit.status === 0 ? commit.stdout.trim() : null,
    git_dirty: dirty.status === 0 ? dirty.stdout.trim().length > 0 : null };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--list') {
    for (const item of cases) console.log(`${item.id}: ${item.title}`);
    return;
  }
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: node scripts/demo.mjs [--case ID] [--json]\n       node scripts/demo.mjs --list');
    return;
  }
  let selected = cases;
  let json = false;
  let selectedId;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') json = true;
    else if (args[i] === '--case' && !selectedId && args[i + 1]) selectedId = args[++i];
    else throw new Error(`Invalid argument: ${args[i]}. Run node scripts/demo.mjs --help`);
  }
  if (selectedId) {
    selected = cases.filter(item => item.id === selectedId);
    if (!selected.length) throw new Error(`Unknown case: ${selectedId}. Run node scripts/demo.mjs --list`);
  }
  const engine = join(root, '_build/js/release/build/cmd/main/main.js');
  if (!existsSync(engine)) throw new Error('Build first: moon build --target js --release');
  const metadata = gitMetadata();
  const results = selected.map(execute);
  const summary = { schema_version: 1, executed_at: new Date().toISOString(),
    ...metadata,
    engine_sha256: createHash('sha256').update(readFileSync(engine)).digest('hex'),
    total: results.length, passed: results.filter(item => item.matches).length, cases: results };
  const destination = join(root, 'artifacts/demo');
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'report.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(join(destination, 'report.md'), markdown(summary));
  if (json) console.log(JSON.stringify(summary, null, 2));
  else {
    for (const item of results) {
      console.log(`\n[${item.matches ? 'PASS' : 'FAIL'}] ${item.title} (${item.id})`);
      console.log(`> ${item.command}`);
      process.stdout.write(item.text_run.stdout);
      if (item.text_run.stderr) process.stderr.write(item.text_run.stderr);
      console.log(`退出码：${item.text_run.exit_code}；预期：${item.expected_exit_code}`);
    }
    console.log(`\n${summary.passed}/${summary.total} 项符合预期。报告：artifacts/demo/report.md`);
  }
  if (summary.passed !== summary.total) process.exitCode = 1;
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }

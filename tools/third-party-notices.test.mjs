import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const preservesManual = fs.readFileSync(new URL('./generate-third-party-notices.php', import.meta.url), 'utf8').includes('BEGIN MANUAL NOTICES');

function fixture(t, report, exitCode = 0) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'third-party-notices-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'tools'));
  fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync(new URL('./generate-third-party-notices.php', import.meta.url), path.join(root, 'tools/generate-third-party-notices.php'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture', dependencies: { '@scope/runtime': '^1' }, devDependencies: { 'dev-only': '^1' } }));
  fs.writeFileSync(path.join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'vendor/runtime', license: ['MIT'] }], 'packages-dev': [{ name: 'vendor/development', license: ['MIT'] }] }));
  const original = '# Existing\n<!-- BEGIN MANUAL NOTICES -->\nKeep the bundled font notice.\n<!-- END MANUAL NOTICES -->\n';
  const notices = path.join(root, 'THIRD_PARTY_NOTICES.md');
  fs.writeFileSync(notices, original);
  const command = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (!args.includes('--prod') || !args.includes('--json') || !args.includes('--long')) process.exit(3);
process.stdout.write(${JSON.stringify(report)});
process.exit(${exitCode});
`;
  fs.writeFileSync(path.join(root, 'bin/pnpm'), command, { mode: 0o755 });
  const result = spawnSync('php', [path.join(root, 'tools/generate-third-party-notices.php')], { cwd: root, env: { ...process.env, PATH: path.join(root, 'bin') + path.delimiter + process.env.PATH }, encoding: 'utf8' });
  return { result, original, actual: fs.readFileSync(notices, 'utf8') };
}

test('native production reports retain scoped packages, PHP and manual notices', (t) => {
  const { result, actual } = fixture(t, JSON.stringify({ MIT: [{ name: '@scope/runtime', homepage: 'https://example.invalid/runtime' }, { name: 'fixture' }] }));
  assert.equal(result.status, 0, result.stderr);
  assert(actual.includes('- @scope/runtime — MIT — https://example.invalid/runtime'));
  assert(actual.includes('- vendor/runtime — MIT'));
  if (preservesManual) assert(actual.includes('Keep the bundled font notice.'));
  assert(!actual.includes('dev-only') && !actual.includes('vendor/development'));
  assert(!actual.includes('- fixture —'));
});

for (const [label, report, exitCode] of [['failed command', '{}', 2], ['empty report', '{}', 0], ['invalid JSON', '{invalid', 0]]) {
  test(`${label} preserves the previous notice file and fails`, (t) => {
    const { result, original, actual } = fixture(t, report, exitCode);
    assert.notEqual(result.status, 0);
    assert.equal(actual, original);
  });
}

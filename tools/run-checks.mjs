import { spawnSync } from "node:child_process";
import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const requestedChecks = [
  ["Generated assets", "build:check"],
  ["ESLint", "lint"],
  ["Panel bundle", "test:bundle"],
  ["Plugin assets", "test:assets"],
  ["Release archive", "test:archive"],
  ["Documentation", "docs:verify"],
  ["Repository hygiene", "test:hygiene"],
].filter(([, script]) => packageJson.scripts?.[script]);

function printFailure(label, result) {
  process.stdout.write(`✗ ${label}\n`);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) {
    process.stdout.write(`\n--- ${label} details ---\n${output}\n--- end details ---\n`);
  }
}

for (const [label, script] of requestedChecks) {
  const result = spawnSync(pnpm, ["run", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) {
    printFailure(label, result);
    process.exit(result.status ?? 1);
  }

  process.stdout.write(`✓ ${label}\n`);
}

process.stdout.write("\nBrowser tests\n");
const browser = spawnSync(pnpm, ["run", "test:browser"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (browser.error || browser.status !== 0) {
  process.stdout.write("✗ Browser tests\n");
  process.stdout.write("Detailed report: pnpm run test:browser:report\n");
  process.stdout.write("Raw PHP logs: pnpm run test:browser:debug\n");
  process.exit(browser.status ?? 1);
}

process.stdout.write("✓ Browser tests\n");

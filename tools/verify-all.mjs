import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const composer = process.platform === "win32" ? "composer.bat" : "composer";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const composerBinSuffix = process.platform === "win32" ? ".bat" : "";
const requiredSetupFiles = [
  "vendor/autoload.php",
  "playground/vendor/autoload.php",
  "playground/kirby",
  "playground/site/plugins/kirby-hidden-characters",
  `vendor/bin/php-cs-fixer${composerBinSuffix}`,
  `vendor/bin/psalm${composerBinSuffix}`,
  `vendor/bin/phpunit${composerBinSuffix}`,
  "node_modules/.modules.yaml",
];

const missingSetupFiles = requiredSetupFiles.filter((path) => !existsSync(path));
if (missingSetupFiles.length > 0) {
  process.stdout.write("✗ Dependency setup\n\n");
  process.stdout.write(`Missing generated dependencies:\n${missingSetupFiles.map((path) => `  - ${path}`).join("\n")}\n\n`);
  process.stdout.write("Run these commands from the repository root:\n\n");
  process.stdout.write("  composer run setup\n  pnpm run setup\n\n");
  process.exit(1);
}
process.stdout.write("✓ Dependency setup\n");

const checks = [
  ["Composer manifest", composer, ["validate", "--strict", "--no-check-version"]],
  ["PHP platform", composer, ["check-platform-reqs"]],
  ["PHP coding style", composer, ["run", "lint"]],
  ["PHP static analysis", composer, ["run", "psalm"]],
  ["PHP unit tests", composer, ["run", "test:unit"]],
  ["PHP integration tests", composer, ["run", "test:integration"]],
  ["PHP runtime smoke test", composer, ["run", "test:smoke"]],
  ["Release readiness", composer, ["run", "release:check"]],
];

function runCaptured(label, command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });

    child.on("error", (error) => {
      output += `${error.message}\n`;
      process.stdout.write(`✗ ${label}\n`);
      process.stdout.write(`\n--- ${label} details ---\n${output.trim()}\n--- end details ---\n`);
      process.exitCode = 1;
      resolve(false);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        process.stdout.write(`✗ ${label}\n`);
        const details = output.trim();
        if (details) {
          process.stdout.write(`\n--- ${label} details ---\n${details}\n--- end details ---\n`);
        }
        process.exitCode = code ?? 1;
        resolve(false);
        return;
      }

      process.stdout.write(`✓ ${label}\n`);
      resolve(true);
    });
  });
}

for (const [label, command, args] of checks) {
  const passed = await runCaptured(label, command, args);
  if (!passed) process.exit(process.exitCode ?? 1);
}

const nodeChecks = spawnSync(pnpm, ["run", "verify"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (nodeChecks.error || nodeChecks.status !== 0) {
  process.exit(nodeChecks.status ?? 1);
}

const diff = spawnSync("git", ["diff", "--check"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
});
if (diff.error || diff.status !== 0) {
  process.stdout.write("✗ Git whitespace\n");
  const output = `${diff.stdout ?? ""}${diff.stderr ?? ""}`.trim();
  if (output) process.stdout.write(`\n${output}\n`);
  process.exit(diff.status ?? 1);
}
process.stdout.write("✓ Git whitespace\n");

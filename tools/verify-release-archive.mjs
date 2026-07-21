#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "kirby-archive-"));
const archivePath = path.join(temporaryDirectory, "release.tar");
const requiredEntries = [
  "composer.json",
  "index.php",
  "index.js",
  "index.css",
  "README.md",
  "CHANGELOG.md",
  "LICENSE.md",
  "THIRD_PARTY_NOTICES.md",
  "assets/fonts/hidden-characters.woff2",
];
const forbiddenPrefixes = [
  ".github/",
  ".husky/",
  "docs/",
  "node_modules/",
  "playground/",
  "src/",
  "tests/",
  "tools/",
  "vendor/",
];
const forbiddenFiles = new Set([
  ".env",
  "composer.lock",
  "package.json",
  "pnpm-lock.yaml",
]);

function archiveCurrentWorktree() {
  const indexPath = path.join(temporaryDirectory, "index");
  const environment = { ...process.env, GIT_INDEX_FILE: indexPath };

  try {
    execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd: root,
      env: environment,
      stdio: "ignore",
    });
    execFileSync("git", ["read-tree", "HEAD"], { cwd: root, env: environment });
  } catch {
    execFileSync("git", ["read-tree", "--empty"], { cwd: root, env: environment });
  }

  execFileSync("git", ["add", "--all", "--", "."], {
    cwd: root,
    env: environment,
    stdio: "inherit",
  });

  const tree = execFileSync("git", ["write-tree"], {
    cwd: root,
    env: environment,
    encoding: "utf8",
  }).trim();

  execFileSync("git", ["archive", "--format=tar", "-o", archivePath, tree], {
    cwd: root,
    stdio: "inherit",
  });
}

try {
  archiveCurrentWorktree();

  const entries = execFileSync("tar", ["-tf", archivePath], { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => entry.replace(/^\.\//, ""));
  const errors = [];

  for (const required of requiredEntries) {
    if (!entries.includes(required)) errors.push(`missing runtime archive entry: ${required}`);
  }

  for (const entry of entries) {
    if (forbiddenFiles.has(entry)) errors.push(`development file entered archive: ${entry}`);
    if (forbiddenPrefixes.some((prefix) => entry.startsWith(prefix))) {
      errors.push(`development path entered archive: ${entry}`);
    }
  }

  if (errors.length > 0) {
    console.error("Release archive verification failed:");
    for (const error of [...new Set(errors)]) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log(`Release archive verification passed (${entries.length} entries).`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

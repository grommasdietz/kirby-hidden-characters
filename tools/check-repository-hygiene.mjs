#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const generatedPluginRoots = [
  "playground/site/plugins",
  "tests/.plugins",
];
const forbiddenNames = new Set([".DS_Store", ".env", ".phpunit.result.cache"]);
const forbiddenDirectories = [
  ".husky/_",
  "playground/media",
  "playground/site/accounts",
  "playground/site/cache",
  "playground/site/logs",
  "playground/site/sessions",
  "playwright-report",
  "test-results",
];
const forbiddenExtensions = new Set([".sqlite", ".sqlite3"]);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "kirby-hygiene-"));
const temporaryIndex = path.join(temporaryDirectory, "index");
const environment = { ...process.env, GIT_INDEX_FILE: temporaryIndex };
const errors = [];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    ...options,
  });
}

function initializeTemporaryIndex() {
  try {
    const realIndex = execFileSync("git", ["rev-parse", "--git-path", "index"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const absoluteIndex = path.isAbsolute(realIndex)
      ? realIndex
      : path.join(root, realIndex);

    if (fs.existsSync(absoluteIndex)) {
      fs.copyFileSync(absoluteIndex, temporaryIndex);
      return;
    }
  } catch {
    // Fall through to a tree-based index.
  }

  try {
    git(["read-tree", "HEAD"]);
  } catch {
    git(["read-tree", "--empty"]);
  }
}

function candidateEntries() {
  initializeTemporaryIndex();
  git(["add", "--all", "--", "."], { stdio: "ignore" });

  return git(["ls-files", "--stage", "-z"])
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const match = /^(\d{6}) [0-9a-f]+ \d+\t(.+)$/.exec(record);
      if (match === null) {
        throw new Error(`Unable to parse Git index entry: ${record}`);
      }

      return { mode: match[1], path: match[2] };
    });
}

function isWithin(relativePath, directory) {
  return relativePath === directory || relativePath.startsWith(`${directory}/`);
}

try {
  const entries = candidateEntries();

  for (const entry of entries) {
    const relative = entry.path.split(path.sep).join("/");
    const basename = path.posix.basename(relative);

    if (entry.mode === "120000") {
      errors.push(`${relative} is an unexpected symbolic link`);
    }

    if (forbiddenNames.has(basename)) {
      errors.push(`${relative} is forbidden`);
    }

    if (forbiddenDirectories.some((directory) => isWithin(relative, directory))) {
      errors.push(`${relative} is generated local state and must not be committed`);
    }

    for (const pluginRoot of generatedPluginRoots) {
      if (relative.startsWith(`${pluginRoot}/`) && relative !== `${pluginRoot}/.gitkeep`) {
        errors.push(`${relative} is an installed plugin artifact; keep only .gitkeep`);
      }
    }

    if (forbiddenExtensions.has(path.posix.extname(relative).toLowerCase())) {
      errors.push(`${relative} looks like a local database`);
    }

    if (/oauth.*token|token.*store/i.test(basename)) {
      errors.push(`${relative} looks like a token store`);
    }
  }

  if (errors.length > 0) {
    console.error("Repository hygiene check failed:");
    for (const error of [...new Set(errors)]) console.error(` - ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Repository hygiene check passed (${entries.length} candidate entries).`);
  }
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

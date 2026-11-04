import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = path.dirname(
  require.resolve("semantic-release/package.json"),
);

test("breaking-change footers select a major release with the configured analyzer", async () => {
  const { analyzeCommits } = await import("@semantic-release/commit-analyzer");
  const config = JSON.parse(
    readFileSync(path.join(root, ".releaserc"), "utf8"),
  );
  const analyzer = config.plugins.find(
    (plugin) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) ===
      "@semantic-release/commit-analyzer",
  );
  assert(analyzer, "The release pipeline must configure the commit analyzer");
  const options = Array.isArray(analyzer) ? analyzer[1] : {};
  const logger = { log() {} };

  assert.equal(
    await analyzeCommits(options, {
      cwd: root,
      commits: [
        {
          hash: "migration",
          message:
            "feat(panel): support the next Kirby major\n\nBREAKING CHANGE: Requires the new Panel runtime.",
        },
      ],
      logger,
    }),
    "major",
  );

  assert.equal(
    await analyzeCommits(options, {
      cwd: root,
      commits: [
        { hash: "maintenance", message: "fix(panel): preserve marker colors" },
      ],
      logger,
    }),
    "patch",
  );
});

test("GitHub/Composer release pipeline loads without the unused npm publisher", async () => {
  const releaseRequire = createRequire(path.join(releaseRoot, "package.json"));
  assert.throws(() => releaseRequire.resolve("@semantic-release/npm"), {
    code: "MODULE_NOT_FOUND",
  });
  const { default: getConfig } = await import(
    pathToFileURL(path.join(releaseRoot, "lib/get-config.js"))
  );
  const { options, plugins } = await getConfig({
    cwd: root,
    env: {},
    logger: { log() {}, error() {}, success() {} },
  });
  const configured = options.plugins.map((plugin) =>
    Array.isArray(plugin) ? plugin[0] : plugin,
  );
  assert(configured.includes("@semantic-release/github"));
  assert(configured.includes("@semantic-release/exec"));
  assert(configured.includes("@semantic-release/git"));
  assert(!configured.includes("@semantic-release/npm"));
  assert.equal(typeof plugins.prepare, "function");
  assert.equal(typeof plugins.publish, "function");
});

test("release readiness follows reachable tags in the current plugin major", () => {
  const fixture = mkdtempSync(
    path.join(os.tmpdir(), "hidden-characters-release-"),
  );
  const git = (...args) =>
    execFileSync("git", args, { cwd: fixture, encoding: "utf8" }).trim();
  try {
    for (const file of [
      ".gitattributes",
      ".releaserc",
      ".node-version",
      "CHANGELOG.md",
      "LICENSE.md",
      "README.md",
      "THIRD_PARTY_NOTICES.md",
      "composer.json",
      "composer.lock",
      "index.php",
      "package.json",
      "phpunit.xml.dist",
      "tools/set-version.mjs",
      "tools/release-readiness.php",
      "playground/composer.json",
    ]) {
      mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
      copyFileSync(path.join(root, file), path.join(fixture, file));
    }
    const version = JSON.parse(
      readFileSync(path.join(root, "composer.json")),
    ).version;
    const [major, minor, patch] = version.split(".").map(Number);
    git("init", "-q");
    git("config", "user.name", "Release fixture");
    git("config", "user.email", "fixture@example.test");
    git("add", ".");
    git("commit", "-qm", "chore: release fixture");
    git("tag", `v${version}`);
    git("tag", `v${major + 1}.0.0`);
    const head = git("rev-parse", "HEAD");
    git("commit", "--allow-empty", "-qm", "chore: future release");
    git("tag", `v${major}.${minor + 1}.0`);
    git("checkout", "--detach", "-q", head);
    const check = () =>
      spawnSync("php", ["tools/release-readiness.php"], {
        cwd: fixture,
        encoding: "utf8",
      });
    let result = check();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    git("tag", `v${major}.${minor}.${patch + 1}`);
    result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /older than latest Git tag/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

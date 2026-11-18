import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import semver from "semver";

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("release archive accepts current metadata and rejects stale versions and mismatched tooling", () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "kirby-release-contract-"),
  );
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    const files = execFileSync("git", ["ls-files", "-z"], {
      cwd: source,
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean);
    for (const file of files) {
      const original = path.join(source, file);
      if (!fs.existsSync(original) || !fs.statSync(original).isFile()) continue;
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.copyFileSync(original, path.join(root, file));
    }
    for (const file of [
      "TEMPLATE_SETUP.md",
      "licenses",
      "tools/cleanup-template.php",
      "tools/init-config.json",
      "tools/init.php",
      "tools/switch-license.php",
    ])
      fs.rmSync(path.join(root, file), { recursive: true, force: true });
    fs.symlinkSync(
      path.join(source, "node_modules"),
      path.join(root, "node_modules"),
      "dir",
    );
    git("init", "-q");
    git("config", "user.name", "Release fixture");
    git("config", "user.email", "fixture@example.test");
    git("add", ".");
    // Keep the dependency link out of fixtures even where ignore rules only match directories.
    git("rm", "--cached", "--ignore-unmatch", "node_modules");
    git("commit", "-qm", "chore: release fixture");
    const manifestPath = path.join(root, "composer.json");
    const version = JSON.parse(fs.readFileSync(manifestPath)).version;
    git("tag", `v${version}`);
    git("tag", `v${semver.inc(version, "major")}`);
    const head = git("rev-parse", "HEAD");
    git("commit", "--allow-empty", "-qm", "chore: future release");
    git("tag", `v${semver.inc(semver.coerce(version), "minor")}`);
    git("checkout", "--detach", "-q", head);
    const check = () =>
      spawnSync(process.execPath, ["tools/verify-release-archive.mjs"], {
        cwd: root,
        encoding: "utf8",
      });
    let result = check();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const newer = `v${semver.inc(semver.coerce(version), "patch")}`;
    git("tag", newer);
    result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /older than a reachable Git tag/);
    git("tag", "-d", newer);
    const packagePath = path.join(root, "package.json");
    const originalPackage = fs.readFileSync(packagePath, "utf8");
    const tooling = JSON.parse(originalPackage);
    tooling.version = semver.inc(version, "major");
    fs.writeFileSync(packagePath, JSON.stringify(tooling));
    result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /same valid release version/);
    fs.writeFileSync(packagePath, originalPackage);
    fs.writeFileSync(path.join(root, ".node-version"), "99\n");
    result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /same tooling major/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

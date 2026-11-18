#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import semver from "semver";

const root = process.cwd();
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "kirby-archive-"),
);
const archivePath = path.join(temporaryDirectory, "release.tar");
const isTemplate = false;

function verifyReleaseMetadata() {
  const readJson = (file) =>
    JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  const composer = readJson("composer.json");
  const tooling = readJson("package.json");
  const playground = readJson("playground/composer.json");
  const release = fs.existsSync(path.join(root, ".releaserc")) ? readJson(".releaserc") : null;
  const errors = [];

  if (!semver.valid(composer.version) || composer.version !== tooling.version) {
    errors.push(
      "composer.json and package.json must have the same valid release version",
    );
  }
  if (
    composer.type !== "kirby-plugin" ||
    !composer.require?.["getkirby/composer-installer"]
  ) {
    errors.push(
      "Composer must declare a Kirby plugin with the Composer installer",
    );
  }
  if (
    ![composer.homepage, composer.support?.docs, composer.support?.source].some(
      (link) => typeof link === "string",
    )
  ) {
    errors.push("Composer must provide a homepage or support link");
  }
  if (tooling.private !== true) {
    errors.push("package.json must remain private because it is tooling-only");
  }
  const minimum = semver.minVersion(composer.require?.php);
  const playgroundMinimum = semver.minVersion(playground.require?.php);
  if (
    minimum &&
    playgroundMinimum &&
    (semver.lt(playgroundMinimum, minimum) ||
      !semver.satisfies(
        playground.config?.platform?.php ?? "0.0.0",
        composer.require.php,
      ))
  ) {
    errors.push(
      "The playground PHP requirements and platform must satisfy the plugin minimum",
    );
  }
  const pin = fs.readFileSync(path.join(root, ".node-version"), "utf8").trim();
  const nodeMinimum = semver.minVersion(tooling.engines?.node);
  if (
    !/^\d+$/.test(pin) ||
    !nodeMinimum ||
    String(nodeMinimum.major) !== pin ||
    semver.intersects(tooling.engines.node, `>=${Number(pin) + 1}.0.0`)
  ) {
    errors.push(
      ".node-version and engines.node must select the same tooling major",
    );
  }
  const manager = /^pnpm@([^+]+)(?:\+.*)?$/.exec(tooling.packageManager ?? "");
  if (
    !manager ||
    !semver.valid(manager[1]) ||
    !semver.satisfies(manager[1], tooling.engines?.pnpm ?? "")
  ) {
    errors.push("packageManager must pin pnpm within engines.pnpm");
  }
  if (release) {
  const plugins = (release.plugins ?? []).map((plugin) =>
    Array.isArray(plugin) ? plugin[0] : plugin,
  );
  for (const plugin of [
    "@semantic-release/changelog",
    "@semantic-release/exec",
    "@semantic-release/git",
    "@semantic-release/github",
  ]) {
    if (!plugins.includes(plugin))
      errors.push(`.releaserc is missing ${plugin}`);
  }
  if (!JSON.stringify(release).includes("tools/set-version.mjs")) {
    errors.push(
      ".releaserc must synchronize manifest versions with tools/set-version.mjs",
    );
  }
  for (const file of [
    ".gitattributes",
    "composer.lock",
    "phpunit.xml.dist",
    "tools/set-version.mjs",
  ]) {
    if (!fs.existsSync(path.join(root, file)))
      errors.push(`missing release file: ${file}`);
  }
  }
  if (!isTemplate) {
    const tags = execFileSync(
      "git",
      ["tag", "--merged", "HEAD", "--list", "v[0-9]*"],
      { cwd: root, encoding: "utf8" },
    )
      .trim()
      .split(/\r?\n/)
      .map((tag) => semver.valid(tag))
      .filter(Boolean);
    if (
      semver.valid(composer.version) &&
      tags.some(
        (tag) =>
          semver.major(tag) === semver.major(composer.version) &&
          semver.gt(tag, composer.version),
      )
    ) {
      errors.push(
        "Manifest version is older than a reachable Git tag in this major",
      );
    }
    for (const file of [
      "TEMPLATE_SETUP.md",
      "licenses",
      "tools/cleanup-template.php",
      "tools/init-config.json",
      "tools/init.php",
      "tools/switch-license.php",
    ]) {
      if (fs.existsSync(path.join(root, file)))
        errors.push(`template-only path must be removed: ${file}`);
    }
  }
  return errors;
}

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
  "assets/fonts/hidden-characters-writer.woff2",
  "assets/fonts/hidden-characters-metrics.woff2",
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
  ".pnpmfile.cjs",
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
    execFileSync("git", ["read-tree", "--empty"], {
      cwd: root,
      env: environment,
    });
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

  // A relative filename also works with GNU tar on Windows, where an absolute
  // drive path such as C:\\… would otherwise be interpreted as a remote host.
  const entries = execFileSync("tar", ["-tf", path.basename(archivePath)], {
    cwd: temporaryDirectory,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => entry.replace(/^\.\//, ""));
  const errors = verifyReleaseMetadata();

  for (const required of requiredEntries) {
    if (!entries.includes(required))
      errors.push(`missing runtime archive entry: ${required}`);
  }

  for (const entry of entries) {
    if (forbiddenFiles.has(entry))
      errors.push(`development file entered archive: ${entry}`);
    if (forbiddenPrefixes.some((prefix) => entry.startsWith(prefix))) {
      errors.push(`development path entered archive: ${entry}`);
    }
  }

  if (errors.length > 0) {
    console.error("Release archive verification failed:");
    for (const error of [...new Set(errors)]) console.error(` - ${error}`);
    process.exit(1);
  }

  console.log(
    `Release archive verification passed (${entries.length} entries).`,
  );
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

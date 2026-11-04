import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  const config = JSON.parse(readFileSync(path.join(root, ".releaserc"), "utf8"));
  const analyzer = config.plugins.find((plugin) =>
    (Array.isArray(plugin) ? plugin[0] : plugin) === "@semantic-release/commit-analyzer"
  );
  assert(analyzer, "The release pipeline must configure the commit analyzer");
  const options = Array.isArray(analyzer) ? analyzer[1] : {};
  const logger = { log() {} };

  assert.equal(await analyzeCommits(options, {
    cwd: root,
    commits: [{
      hash: "migration",
      message: "feat(panel): support the next Kirby major\n\nBREAKING CHANGE: Requires the new Panel runtime.",
    }],
    logger,
  }), "major");

  assert.equal(await analyzeCommits(options, {
    cwd: root,
    commits: [{ hash: "maintenance", message: "fix(panel): preserve marker colors" }],
    logger,
  }), "patch");
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

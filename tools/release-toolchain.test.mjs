import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const releaseRoot = path.dirname(
  require.resolve("semantic-release/package.json"),
);

test("GitHub/Composer release pipeline loads without the unused npm publisher", async () => {
  const releaseRequire = createRequire(path.join(releaseRoot, "package.json"));
  assert.throws(() => releaseRequire.resolve("@semantic-release/npm"), {
    code: "MODULE_NOT_FOUND",
  });
  const { default: getConfig } = await import(
    pathToFileURL(path.join(releaseRoot, "lib/get-config.js"))
  );
  const { options, plugins } = await getConfig({
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
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

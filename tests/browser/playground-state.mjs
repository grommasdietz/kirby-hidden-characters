import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

function paths(root) {
  const content = path.join(root, "playground", "content");
  const cache = path.join(root, "node_modules", ".cache", "kirby-playwright");
  const snapshot = path.join(cache, "content");

  return { content, cache, snapshot };
}

/**
 * Restores a previous snapshot when an earlier test run was interrupted,
 * then captures the current tracked playground content for this run.
 */
export function snapshotPlaygroundContent(root) {
  restorePlaygroundContent(root);

  const { content, cache, snapshot } = paths(root);

  if (!existsSync(content)) {
    throw new Error(`Playground content directory is missing: ${content}`);
  }

  mkdirSync(cache, { recursive: true });
  cpSync(content, snapshot, { recursive: true });
}

/**
 * Restores the exact playground content bytes captured before browser tests.
 * Runtime accounts, cache, media and sessions are handled separately.
 */
export function restorePlaygroundContent(root) {
  const { content, cache, snapshot } = paths(root);

  if (!existsSync(snapshot)) {
    return;
  }

  rmSync(content, { recursive: true, force: true });
  mkdirSync(path.dirname(content), { recursive: true });
  cpSync(snapshot, content, { recursive: true });
  rmSync(cache, { recursive: true, force: true });
}

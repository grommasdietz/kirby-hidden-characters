#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "docs");
const rootIndex = path.join(docsDir, "index.md");
const errors = [];

const collectMarkdown = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectMarkdown(full, files);
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;
    files.push(full);
  }

  return files;
};

const getDocOrder = () => {
  const content = fs.readFileSync(rootIndex, "utf8");
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  const targets = [];

  for (const match of content.matchAll(linkPattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    if (/^[a-z]+:/i.test(raw)) continue; // external links (https:, mailto:, ...)

    const withoutHash = raw.split("#")[0];
    if (!withoutHash.endsWith(".md")) continue;

    const resolved = path.resolve(docsDir, withoutHash);
    if (!resolved.startsWith(path.resolve(docsDir) + path.sep)) continue;
    if (path.resolve(resolved) === path.resolve(rootIndex)) continue;

    targets.push(resolved);
  }

  const seen = new Set();
  const uniqueTargets = [];
  for (const target of targets) {
    if (seen.has(target)) continue;
    seen.add(target);
    uniqueTargets.push(target);
  }

  return uniqueTargets;
};

const parseNextTarget = (file) => {
  const content = fs.readFileSync(file, "utf8");
  const match = content.match(/^Next:\s*(.+)$/m);
  if (!match) return { ok: false, reason: 'Missing "Next:" line' };

  const nextLine = match[1];
  const linkMatch = nextLine.match(/\[[^\]]+\]\(([^)]+)\)/);
  if (!linkMatch) return { ok: false, reason: 'Missing Markdown link in "Next:" line' };

  const raw = linkMatch[1]?.trim();
  if (!raw) return { ok: false, reason: 'Empty link target in "Next:" line' };
  if (/^[a-z]+:/i.test(raw)) return { ok: false, reason: '"Next:" link must be a local .md path' };

  const withoutHash = raw.split("#")[0];
  const resolved = path.resolve(path.dirname(file), withoutHash);
  if (!resolved.startsWith(path.resolve(docsDir) + path.sep)) {
    return { ok: false, reason: '"Next:" link must point within docs/' };
  }

  if (!fs.existsSync(resolved)) {
    return { ok: false, reason: `"Next:" target does not exist (${path.relative(process.cwd(), resolved)})` };
  }

  return { ok: true, target: resolved };
};

const allDocs = collectMarkdown(docsDir);
const orderedDocs = getDocOrder();

for (const file of orderedDocs) {
  if (!fs.existsSync(file)) {
    errors.push(
      `docs/index.md references a missing file: ${path.relative(process.cwd(), file)}`
    );
  }
}

const docSet = new Set(allDocs.map((f) => path.resolve(f)));
const orderedSet = new Set(orderedDocs.map((f) => path.resolve(f)));

for (const file of docSet) {
  if (path.resolve(file) === path.resolve(rootIndex)) continue;
  if (!orderedSet.has(file)) {
    errors.push(
      `docs/index.md is missing: ${path.relative(process.cwd(), file)}`
    );
  }
}

for (const file of orderedSet) {
  if (!docSet.has(file)) {
    errors.push(
      `docs/index.md includes a non-doc file: ${path.relative(process.cwd(), file)}`
    );
  }
}

const expectedNext = new Map();
expectedNext.set(path.resolve(rootIndex), orderedDocs[0] ?? null);
for (let i = 0; i < orderedDocs.length; i++) {
  const next = orderedDocs[i + 1] ?? rootIndex;
  expectedNext.set(path.resolve(orderedDocs[i]), path.resolve(next));
}

for (const file of allDocs) {
  const resolvedFile = path.resolve(file);
  const expected = expectedNext.get(resolvedFile);
  if (!expected) continue;

  const result = parseNextTarget(file);
  if (!result.ok) {
    errors.push(`${path.relative(process.cwd(), file)}: ${result.reason}`);
    continue;
  }

  const actual = path.resolve(result.target);
  if (actual !== expected) {
    errors.push(
      `${path.relative(process.cwd(), file)}: expected Next to be ${path.relative(
        process.cwd(),
        expected
      )}, got ${path.relative(process.cwd(), actual)}`
    );
  }
}

if (errors.length) {
  console.error("Docs navigation check failed:");
  for (const error of errors) console.error(" -", error);
  process.exitCode = 1;
} else {
  console.log("Docs navigation looks good (Next links match docs/index.md)");
}

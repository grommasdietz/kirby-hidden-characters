#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsRoot = path.join(root, "docs");
const docsIndex = path.join(docsRoot, "index.md");
const errors = [];

function collectMarkdown(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

const rootMarkdown = [
  "README.md",
  "TEMPLATE_SETUP.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "AGENTS.md",
  "STYLE_GUIDE.md",
]
  .map((file) => path.join(root, file))
  .filter(fs.existsSync);
const docs = collectMarkdown(docsRoot).sort();
const allMarkdown = [...rootMarkdown, ...docs];

function localLinks(file) {
  const content = fs.readFileSync(file, "utf8");
  const links = [];
  const pattern = /!?(?:\[[^\]]*\])\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) {
    const raw = match[1]?.trim().replace(/^<|>$/g, "");
    if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    links.push(raw);
  }
  return links;
}

function resolveLocal(file, raw) {
  const target = raw.split("#", 1)[0];
  if (!target) return null;
  const decoded = decodeURIComponent(target);
  return decoded.startsWith("/")
    ? path.resolve(root, decoded.slice(1))
    : path.resolve(path.dirname(file), decoded);
}

for (const file of allMarkdown) {
  for (const raw of localLinks(file)) {
    const resolved = resolveLocal(file, raw);
    if (resolved && !fs.existsSync(resolved)) {
      errors.push(`${path.relative(root, file)} links to missing ${raw}`);
    }
  }
}

const reachable = new Set();
const queue = [docsIndex];
while (queue.length > 0) {
  const file = path.resolve(queue.shift());
  if (reachable.has(file) || !fs.existsSync(file)) continue;
  reachable.add(file);
  for (const raw of localLinks(file)) {
    const resolved = resolveLocal(file, raw);
    if (!resolved || !resolved.endsWith(".md")) continue;
    if (resolved.startsWith(path.resolve(docsRoot) + path.sep) || resolved === path.resolve(docsIndex)) {
      queue.push(resolved);
    }
  }
}

for (const file of docs) {
  if (path.resolve(file) !== path.resolve(docsIndex) && !reachable.has(path.resolve(file))) {
    errors.push(`${path.relative(root, file)} is not reachable from docs/index.md`);
  }
}

const packageScripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {};
const composerScripts = JSON.parse(fs.readFileSync(path.join(root, "composer.json"), "utf8")).scripts ?? {};
const pnpmBuiltins = new Set(["install", "update", "add", "remove", "exec", "dlx", "why", "list", "config"]);
const composerBuiltins = new Set([
  "install",
  "update",
  "require",
  "remove",
  "validate",
  "check-platform-reqs",
  "show",
  "dump-autoload",
  "global",
  "config",
]);

function documentedCode(content) {
  const snippets = [];
  for (const match of content.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) snippets.push(match[1]);
  const withoutFences = content.replace(/```[^\n]*\n[\s\S]*?```/g, "");
  for (const match of withoutFences.matchAll(/`([^`\n]+)`/g)) snippets.push(match[1]);
  return snippets.join("\n");
}

for (const file of allMarkdown) {
  const code = documentedCode(fs.readFileSync(file, "utf8"));
  for (const match of code.matchAll(/(?:^|[;&|\n])\s*pnpm(?:[ \t]+run)?[ \t]+([a-z0-9:_-]+)/gi)) {
    const command = match[1];
    if (!pnpmBuiltins.has(command) && !(command in packageScripts)) {
      errors.push(`${path.relative(root, file)} documents missing pnpm script: ${command}`);
    }
  }
  for (const match of code.matchAll(/(?:^|[;&|\n])\s*composer(?:[ \t]+run)?[ \t]+([a-z0-9:_-]+)/gi)) {
    const command = match[1];
    if (!composerBuiltins.has(command) && !(command in composerScripts)) {
      errors.push(`${path.relative(root, file)} documents missing Composer script: ${command}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Documentation verification failed:");
  for (const error of [...new Set(errors)]) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`Documentation verification passed (${allMarkdown.length} Markdown files).`);

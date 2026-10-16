#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsRoot = path.join(root, "docs");
const docsIndex = path.join(docsRoot, "index.md");
const errors = [];
const historical = new Set(["CHANGELOG.md", "LICENSE.md", "THIRD_PARTY_NOTICES.md", "PATCH-NOTES.md"]);

function collectMarkdown(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink() || ["node_modules", "vendor", ".git"].includes(entry.name)) return [];
    return entry.isDirectory() ? collectMarkdown(full) : entry.name.endsWith(".md") ? [full] : [];
  });
}

const rootMarkdown = fs.readdirSync(root).filter((file) => file.endsWith(".md") && !historical.has(file)).map((file) => path.join(root, file));
const docs = collectMarkdown(docsRoot).sort();
const allMarkdown = [...new Set([
  ...rootMarkdown, ...docs,
  ...[".github", "example", "examples", "tests"].flatMap((directory) => collectMarkdown(path.join(root, directory))),
])];

function prose(content) {
  return content.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[^\n]*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");
}

function localLinks(file) {
  const content = prose(fs.readFileSync(file, "utf8"));
  const links = [...content.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1].replace(/^<|>$/g, ""));
  links.push(...[...content.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm)].map((match) => match[1].replace(/^<|>$/g, "")));
  return links.filter((raw) => raw && !/^[a-z][a-z0-9+.-]*:/i.test(raw) && !raw.startsWith("//"));
}

function resolveLocal(file, raw) {
  const [target, fragment] = raw.split("#", 2);
  let decoded;
  try {
    decoded = decodeURIComponent(target.split("?", 1)[0]);
  } catch {
    errors.push(`${path.relative(root, file)} has an invalid link: ${raw}`);
    return null;
  }
  let resolved = !decoded ? file : decoded.startsWith("/") ? path.resolve(root, decoded.slice(1)) : path.resolve(path.dirname(file), decoded);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    resolved = ["index.md", "README.md"].map((name) => path.join(resolved, name)).find(fs.existsSync) ?? resolved;
  }
  return { resolved, fragment };
}

const anchorCache = new Map();
function anchors(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const content = prose(fs.readFileSync(file, "utf8"));
  const result = new Set();
  for (const match of content.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) {
    result.add(match[1]);
  }
  for (const match of content.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = match[1].toLowerCase().replace(/<[^>]*>/g, "").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, "").replace(/ /g, "-");
    let unique = slug;
    for (let i = 1; result.has(unique); i++) unique = `${slug}-${i}`;
    result.add(unique);
  }
  anchorCache.set(file, result);
  return result;
}

for (const file of allMarkdown) {
  for (const raw of localLinks(file)) {
    const link = resolveLocal(file, raw);
    if (!link) continue;
    const { resolved, fragment } = link;
    if (!fs.existsSync(resolved)) {
      errors.push(`${path.relative(root, file)} links to missing ${raw}`);
    } else if (fragment && resolved.endsWith(".md")) {
      try {
        if (!anchors(resolved).has(decodeURIComponent(fragment))) errors.push(`${path.relative(root, file)} links to missing anchor ${raw}`);
      } catch {
        errors.push(`${path.relative(root, file)} has an invalid anchor: ${raw}`);
      }
    }
  }
}

if (docs.length > 0 && !fs.existsSync(docsIndex)) errors.push("docs/index.md is missing");
const reachable = new Set();
const queue = [docsIndex];
while (queue.length > 0) {
  const file = path.resolve(queue.shift());
  if (reachable.has(file) || !fs.existsSync(file)) continue;
  reachable.add(file);
  for (const raw of localLinks(file)) {
    const link = resolveLocal(file, raw);
    if (link?.resolved.endsWith(".md") && link.resolved.startsWith(docsRoot + path.sep)) queue.push(link.resolved);
  }
}
for (const file of docs) {
  if (!reachable.has(file)) errors.push(`${path.relative(root, file)} is not reachable from docs/index.md`);
}

const packageScripts = fs.existsSync(path.join(root, "package.json")) ? JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {} : {};
const composerScripts = JSON.parse(fs.readFileSync(path.join(root, "composer.json"), "utf8")).scripts ?? {};
const pnpmBuiltins = new Set(["install", "update", "add", "remove", "exec", "dlx", "why", "list", "config", "pack", "audit", "outdated"]);
const composerBuiltins = new Set(["install", "update", "require", "remove", "validate", "check-platform-reqs", "show", "dump-autoload", "global", "config", "exec", "audit", "outdated"]);

function documentedCode(content) {
  const snippets = [...content.matchAll(/```[^\n]*\n([\s\S]*?)```/g)]
    .map((match) => match[1]);
  for (const match of prose(content).matchAll(/`([^`\n]+)`/g)) {
    snippets.push(match[1]);
  }
  return snippets.join("\n");
}

const commandPattern = new RegExp(
  String.raw`(?:^|[;&|\n])\s*(?:corepack[ \t]+)?(pnpm|composer)` +
    String.raw`(?:[ \t]+run)?[ \t]+([a-z0-9:_-]+)`,
  "gi",
);
for (const file of allMarkdown) {
  const code = documentedCode(fs.readFileSync(file, "utf8"));
  for (const [, rawManager, command] of code.matchAll(commandPattern)) {
    const manager = rawManager.toLowerCase();
    const label = manager === "composer" ? "Composer" : manager;
    const scripts = manager === "pnpm" ? packageScripts : composerScripts;
    const builtins = manager === "pnpm" ? pnpmBuiltins : composerBuiltins;
    if (!builtins.has(command) && !(command in scripts)) {
      errors.push(`${path.relative(root, file)} documents missing ${label} script: ${command}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Documentation verification failed:");
  for (const error of [...new Set(errors)]) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`Documentation verification passed (${allMarkdown.length} Markdown files).`);

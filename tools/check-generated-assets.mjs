#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : ["index.js", "index.css", "assets"];

function collect(target, files = []) {
  const absolute = path.resolve(root, target);
  if (!fs.existsSync(absolute)) return files;

  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return files;
  if (stat.isFile()) {
    files.push(path.relative(root, absolute));
    return files;
  }

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    collect(path.join(target, entry.name), files);
  }

  return files;
}

function digest(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
}

const beforeFiles = [...new Set(targets.flatMap((target) => collect(target)))].sort();
if (beforeFiles.length === 0) {
  console.error("No generated assets found. Adjust build:check targets in package.json.");
  process.exit(1);
}

const before = new Map(beforeFiles.map((file) => [file, digest(file)]));
execFileSync("pnpm", ["run", "build"], { cwd: root, stdio: "inherit" });

const afterFiles = [...new Set(targets.flatMap((target) => collect(target)))].sort();
const changed = [];
for (const file of new Set([...beforeFiles, ...afterFiles])) {
  if (!before.has(file)) {
    changed.push(`${file} (new)`);
    continue;
  }
  if (!afterFiles.includes(file)) {
    changed.push(`${file} (removed)`);
    continue;
  }
  if (before.get(file) !== digest(file)) changed.push(file);
}

if (changed.length > 0) {
  console.error("Generated assets were stale before the build:");
  for (const file of changed) console.error(` - ${file}`);
  console.error("Commit the regenerated outputs and run the check again.");
  process.exit(1);
}

console.log(`Generated assets are current (${afterFiles.length} file${afterFiles.length === 1 ? "" : "s"}).`);

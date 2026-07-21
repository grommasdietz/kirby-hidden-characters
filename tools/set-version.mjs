#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const version = process.argv[2]?.replace(/^v/, "");
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!version || !semver.test(version)) {
  console.error("Usage: node tools/set-version.mjs <semver>");
  process.exit(1);
}

const root = process.cwd();

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function insertAfter(object, key, insertedKey, insertedValue) {
  const entries = Object.entries(object).filter(([entryKey]) => entryKey !== insertedKey);
  const index = entries.findIndex(([entryKey]) => entryKey === key);
  const position = index >= 0 ? index + 1 : 0;

  return Object.fromEntries([
    ...entries.slice(0, position),
    [insertedKey, insertedValue],
    ...entries.slice(position),
  ]);
}

const composerPath = path.join(root, "composer.json");
const packagePath = path.join(root, "package.json");

const composer = insertAfter(readJson(composerPath), "description", "version", version);
const packageJson = insertAfter(readJson(packagePath), "name", "version", version);

writeJson(composerPath, composer);
writeJson(packagePath, packageJson);

console.log(`Updated Composer and Node metadata to ${version}.`);

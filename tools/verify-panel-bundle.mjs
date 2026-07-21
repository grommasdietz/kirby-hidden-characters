#!/usr/bin/env node
import fs from "node:fs";

const runtimeMarkers = [
  "grommasdietz/hidden-characters",
  "gd-hidden-characters",
  "registerHiddenCharactersExtension",
];
const errors = [];

if (!fs.existsSync("index.js") || fs.statSync("index.js").size === 0) {
  errors.push("index.js is missing or empty");
}

if (!fs.existsSync("index.css")) {
  errors.push("index.css is missing");
}

if (fs.existsSync("index.js")) {
  const bundle = fs.readFileSync("index.js", "utf8");

  for (const marker of runtimeMarkers) {
    if (!bundle.includes(marker)) {
      errors.push(`index.js is missing runtime marker: ${marker}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Panel bundle verification failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("Panel bundle verification passed.");

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const errors = [];
const runtime = "assets/fonts/hidden-characters.woff2";
const source = "src/fonts/hidden-characters.glyphs";
const stylesheets = ["src/styles/hidden-characters.css", "index.css"];
for (const file of [runtime, source]) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 100) errors.push(`${file} is missing or unexpectedly small`);
}

let foregroundLayers = 0;
if (fs.existsSync(source)) {
  const glyphs = fs.readFileSync(source, "utf8");
  const markerLayers = [...glyphs.matchAll(/^colorPalette = 0;$/gm)].length;
  foregroundLayers = [...glyphs.matchAll(/^colorPalette = 65535;$/gm)].length;
  if (foregroundLayers === 0 || foregroundLayers !== markerLayers) {
    errors.push("the Glyphs source must pair each marker layer with a foreground-color guard layer");
  }
  if (/^colorPalette = 1;$/m.test(glyphs)) {
    errors.push("the Glyphs source still contains fixed-color guard layers");
  }

  const palette = glyphs.match(/name = "Color Palettes";\s*value = \(\s*\(\s*([\s\S]*?)\s*\)\s*\);/);
  const colors = palette ? [...palette[1].matchAll(/\(\d+,\d+\)/g)] : [];
  if (colors.length !== 1) {
    errors.push("the Glyphs source must contain only the neutral marker palette color");
  }
}

if (fs.existsSync(runtime)) {
  const font = fs.readFileSync(runtime);
  for (const stylesheet of stylesheets) {
    if (!fs.existsSync(stylesheet)) {
      errors.push(`${stylesheet} is missing`);
      continue;
    }
    const css = fs.readFileSync(stylesheet, "utf8");
    const embedded = css.match(/data:font\/woff2;base64,([a-zA-Z0-9+/=]+)/);
    if (!embedded) {
      errors.push(`${stylesheet} does not contain the inlined hidden-characters font`);
    } else if (!Buffer.from(embedded[1], "base64").equals(font)) {
      errors.push(`${stylesheet} does not contain the committed runtime font byte-for-byte`);
    }
    if (css.includes("/media/plugins/grommasdietz/hidden-characters/fonts/hidden-characters.woff2")) {
      errors.push(`${stylesheet} still contains the unresolved Kirby runtime font URL`);
    }
  }
}

const characterRoot = path.join(".github", "assets", "characters");
const variants = ["dark", "light"];
const names = new Map();
for (const variant of variants) {
  const directory = path.join(characterRoot, variant);
  if (!fs.existsSync(directory)) {
    errors.push(`missing documentation icon directory: ${directory}`);
    continue;
  }
  const files = fs.readdirSync(directory).filter((file) => file.endsWith(".svg")).sort();
  names.set(variant, files);
  if (files.length === 0) errors.push(`no SVG icons found in ${directory}`);
  for (const file of files) {
    const svg = fs.readFileSync(path.join(directory, file), "utf8");
    if (!svg.includes("<svg") || !svg.includes("</svg>")) errors.push(`invalid SVG wrapper: ${variant}/${file}`);
  }
}
const dark = names.get("dark") ?? [];
const light = names.get("light") ?? [];
for (const file of new Set([...dark, ...light])) {
  if (!dark.includes(file)) errors.push(`missing dark icon: ${file}`);
  if (!light.includes(file)) errors.push(`missing light icon: ${file}`);
}

const readme = fs.readFileSync("README.md", "utf8");
for (const match of readme.matchAll(/\]\((\/\.github\/assets\/characters\/[^)#]+\.svg)(?:#[^)]+)?\)/g)) {
  const target = match[1].slice(1);
  if (!fs.existsSync(target)) errors.push(`README references missing icon: ${target}`);
}

if (errors.length) {
  console.error("Character asset verification failed:");
  for (const error of [...new Set(errors)]) console.error(` - ${error}`);
  process.exit(1);
}
console.log(
  `Character asset verification passed (${dark.length} light/dark icon pairs, ` +
    `${foregroundLayers} foreground guard layers, and byte-identical runtime fonts).`
);

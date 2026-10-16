# Workflow

This page covers the core developer workflow for Panel assets and tooling.

---

## Panel assets

Panel source lives in `src/index.js` and `src/styles/hidden-characters.css`. The editable font source lives in `src/fonts/hidden-characters.glyphs`; its compiled WOFF2 is committed under `assets/fonts/`.

Build production assets:

```bash
pnpm build
```

> [!NOTE]
> `pnpm build` runs kirbyup and writes `index.js` and `index.css` at the repo root. Keep both committed.

Run the dev server while iterating:

```bash
pnpm dev
```

PostCSS is configured in `postcss.config.cjs` (autoprefixer by default).

---

## Dependency updates and CI

Update the root development dependencies, playground and Node tooling separately:

```bash
composer run update:dev
composer run playground:update
pnpm run update:dev
```

Review changed manifests and locks, rebuild affected assets and run the repository verification commands in the [testing guide](tests.md). Dependency automation and compatibility jobs are defined in `.github/`.

The `.pnpmfile.cjs` hook supplies the TypeScript 6 API to TypeScript ESLint while `check:types` uses the root compiler. Review this bridge when changing the compiler or linter.

Next: Continue with [Tests](./tests.md)

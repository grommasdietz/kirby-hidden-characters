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

## Dependency updates

Update PHP dependencies (repo and playground):

```bash
composer update
composer update -d playground
```

Update JS dev dependencies:

```bash
pnpm run update:dev
```

---

Next: Continue with [Tests](./tests.md)

## Shared maintenance commands

Use the same entry points across the plugin workspace:

```sh
composer run setup
pnpm run setup
composer run update:dev
pnpm run update:dev
composer run playground:update
composer run verify
pnpm run verify
pnpm run verify:all
```

The update commands respect declared version ranges. The PHP command updates
the explicitly listed development dependencies and their required dependencies;
the Node command updates development dependencies. Playground updates are
separate. Review and commit changed manifests and lockfiles, rebuild generated
assets with `pnpm run build`, then run `pnpm run verify:all`.

`composer run verify` owns PHP checks; `pnpm run verify` owns Node, assets,
documentation and deterministic browser checks. `pnpm run verify:all` combines
both with Composer validation and platform checks. Plugin-specific checks stay
in their respective scripts. External acceptance profiles remain opt-in.

Keep reusable build, test and playground helpers in `tools/`. Express simple
command sequences in the manifests instead of custom runners. Store one-off
diagnostics outside the repository; occasional use alone does not make a
release, fixture or acceptance tool disposable.

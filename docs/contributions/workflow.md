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

## Dependency updates and CI

Use `composer run update:dev` for root PHP development dependencies,
`composer run playground:update` for the runtime fixture, and `pnpm run update:dev`
for Node tooling. Review and commit the resulting lockfiles.

Dependabot groups version updates into one PR per ecosystem and lockfile, including
related TypeScript, ESLint, PostCSS and build tools. Each update entry allows one
open version PR. Root and playground Composer locks remain separate. Weekly runs
are staggered across plugins; GitHub Actions updates run monthly.

Plugins using `typescript-eslint` keep TypeScript 6 while its parser depends on
the compiler API removed in TypeScript 7. Dependabot defers TypeScript 7 version
updates in those repositories. Remove that exception after the parser supports
the new API and the full verification suite passes.

Version updates wait three days after publication. pnpm also enforces a strict
24-hour minimum release age for installation and local updates. Dependabot security
updates use separate groups and bypass its version-update cooldown; pnpm's install
age still applies. Patch updates may auto-merge after required checks pass; minor
and major updates need review. Refresh the remaining grouped PR after each merge
to keep its lockfile based on current `main`. Grouping reduces overlapping lockfile
changes but cannot prevent conflicts with manual dependency edits.

CI runs PHP quality, Node, generated-asset, documentation and browser checks with
one shared PHP 8.3 setup where practical. Separate PHP and Kirby compatibility
jobs preserve each plugin's supported-runtime coverage. Stale runs are cancelled,
jobs have time limits, and failed browser artifacts are retained for three days.

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

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

## Verified dependency updates

Signed Dependabot patches and stable minor updates can squash-merge after full
PR verification succeeds for the current head and base. This covers runtime,
development and playground dependencies; every dependency in a group must
qualify. Majors, pre-1.0 minors, prereleases, maintainer changes and unknown
metadata remain manual. GitHub review and branch rules still apply.

The metadata job runs default-branch tools, verifies the official signed commit
and retains a one-day JSON receipt. The write-enabled merge job runs only
trusted default-branch code and responds to completed CI or metadata; no waiting
runner, AI service, automatic approval or paid native auto-merge is needed.
Token-based merges explicitly dispatch main verification because GitHub
suppresses their push-triggered workflows. Existing staging and production
approval gates remain in force.

Dependabot rebases automatically. Conflicts, stale verification and failed
checks stay open for correction. Major updates remain separate; the grouped
minor/patch updates share one PR per ecosystem and directory.

## GitHub YAML formatting

Use the repository's locked Prettier version for workflows and Dependabot files.
Run `pnpm run format:github` after editing or generating GitHub YAML;
`pnpm run lint:github` checks it during existing verification.
The scoped `.github/.prettierrc.json` prefers single quotes and two-space
indentation. Prettier may choose double quotes to avoid escaping; shell, JSON
and GitHub expression quoting follow their own syntax. Do not replace quotes
with a text substitution or format generated lockfiles.

Next: Continue with [Tests](./tests.md)

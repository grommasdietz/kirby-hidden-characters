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

Dependabot patch updates can merge after successful full CI on the exact PR head and base. The official metadata action verifies the signed bot commit and publishes a one-day JSON receipt. The privileged merge job checks that receipt’s trusted workflow and current PR identity; it never runs PR code. CI or metadata completion triggers the decision without a waiting runner or a paid private-repository auto-merge feature. GitHub’s configured review rules still apply; no automatic approval is added.

Minor updates qualify only for installed direct development dependencies `autoprefixer`, `crittr`, `postcss`, `postcss-lab-function` and `sass`. Every dependency in a group must qualify. Runtime minors, other development-tool minors, majors, maintainer changes, unknown metadata and stale or unsuccessful CI stay manual. Updates requiring rebuilt committed assets must pass the existing build checks before merging.

PR titles must use Conventional Commits. After correcting a title, rerun CI. Squash commits use the title and merged branches are deleted automatically. A token-based merge explicitly dispatches main CI because GitHub suppresses the ordinary push trigger. Main dispatches use the same verification and Semantic Release gates as main pushes. Stale verification jobs may be cancelled; release jobs serialize and finish without cancellation. Plugin version fields remain maintained by the release workflow; Composer validation uses `--no-check-version` instead of removing that metadata.

## GitHub YAML formatting

Use the repository's locked Prettier version for workflows and Dependabot files.
Run `pnpm run format:github` after editing or generating GitHub YAML;
`pnpm run lint:github` checks it during existing verification.
The scoped `.github/.prettierrc.json` prefers single quotes and two-space
indentation. Prettier may choose double quotes to avoid escaping; shell, JSON
and GitHub expression quoting follow their own syntax. Do not replace quotes
with a text substitution or format generated lockfiles.

Next: Continue with [Tests](./tests.md)

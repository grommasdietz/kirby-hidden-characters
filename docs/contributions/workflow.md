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

Review changed manifests and locks, rebuild affected assets and run the repository verification commands in the [testing guide](tests.md). CI and compatibility runs are configured in [ci.yml](../../.github/workflows/ci.yml).

The `.pnpmfile.cjs` hook supplies the TypeScript 6 API to TypeScript ESLint while `check:types` uses the root compiler. Review this bridge when changing the compiler or linter.

## CI and verified dependency updates

[CI](../../.github/workflows/ci.yml) calls the shared [kirby-plugin workflow](https://github.com/grommasdietz/.github) from `grommasdietz/.github`. It runs `composer verify` and `pnpm verify`, the PHP compatibility runs listed in `ci.yml`, Conventional Commit checks for pull request titles and commits, and Actionlint. Add new checks to `composer verify` or `pnpm verify`, not to the workflow.

After all checks pass in the same run, Dependabot patches and stable minor updates are squash-merged for their exact head commit. Majors, pre-1.0 minors and pre-releases stay open for review. The workflow then dispatches CI on `main`, because merges made with the workflow token do not trigger push runs.

## GitHub YAML formatting

Use the repository's locked Prettier version for workflows and Dependabot files.
Run `pnpm run format:github` after editing or generating GitHub YAML;
`pnpm run lint:github` checks it during existing verification.
The scoped `.github/.prettierrc.json` prefers single quotes and two-space
indentation. Prettier may choose double quotes to avoid escaping; shell, JSON
and GitHub expression quoting follow their own syntax. Do not replace quotes
with a text substitution or format generated lockfiles.

Next: Continue with [Tests](./tests.md)

## Releases and dependency schedule

Ordinary dependency updates are grouped monthly. Security updates are grouped separately and are not delayed until the monthly schedule. Use the pnpm version pinned in `package.json`.

Semantic Release runs on `main` after all checks pass. Documentation, CI and dependency-only commits do not publish. Publishing is serialized and not cancelled by a newer run; to retry a failed release, rerun the release job or dispatch CI on `main`.

The release toolchain excludes Semantic Release’s unused npm publishing adapter.
These plugins publish GitHub/Composer releases, not npm packages. CI loads the
actual configured plugin pipeline to verify that publishing remains available.
Re-enable the adapter deliberately if npm publication is introduced.

Third-party notices use `pnpm licenses list --prod --json --long`; the generator
preserves manual notices and fails without replacing them when license collection
fails. It does not download a separate license-reporting tool.

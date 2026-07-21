# Agent guide (AI + human)

This is the canonical workflow guide for working on the Kirby Hidden Characters plugin.

---

## Golden rules

- **Keep it ready-to-install.** Composer and GitHub tag-archive installs must work without running `composer` or `npm`. Keep committed build outputs (`index.js`, `index.css`); don’t edit compiled assets by hand.
- **Don’t commit local artifacts.** No `.DS_Store`, no local symlinks, no runtime data from `playground/site/*`, no caches.
- **Single source of truth.** This file is the authoritative convention guide; other docs may link here instead of duplicating rules.

---

## Repo essentials

- Plugin entry: `index.php` registers the compiled Panel assets; the plugin has no PHP runtime layer.
- Panel source: `src/index.js`, `src/styles/hidden-characters.css`, and `src/fonts/hidden-characters.glyphs` are built with `kirbyup` into `index.js`/`index.css`. The compiled WOFF2 lives in `assets/fonts/`. Rebuild with `pnpm build` after Panel changes and commit the outputs.
- Playground: `playground/` is the self-contained Kirby site for integration and browser tests.
- Conventions: use Conventional Commit messages, keep diffs small, keep docs aligned with behavior, and never wrap imports in `try/catch`.
- Static analysis coverage: if PHP source files are added beyond `index.php`, include their directories in `psalm.xml.dist`; add suppressions only for concrete framework patterns that require them.

---

## Coding expectations

- Prefer small, focused diffs and keep public APIs stable unless a change explicitly requires a break.
- Keep repo artifacts shippable: don’t drop the committed Panel build outputs or bundled WOFF2 required by GitHub tag-archive installs.
- Add the smallest useful fixtures under `playground/site/**` when tests need them.
- Update docs when behavior or CLI flags change.

---

## Testing and QA

- Prereqs: `composer run setup`, `pnpm run setup` (installs the Playwright Chromium browser).
- Run `composer test` for PHP changes; add `composer psalm` when you touch PHP logic. Use `composer run verify` for the full PHP sweep.
- Run `pnpm lint` for JS/Panel changes; run `pnpm test:browser` when Panel/Playwright behavior changes. Use `pnpm run verify` for the full generated-asset, lint, documentation, hygiene and browser sweep.
- Add or extend PHPUnit/Playwright coverage for new behavior; include regression tests for bug fixes. Use `tests/bootstrap.php`, `tests/TestCase.php`, and `tests/Support/TestEnvironment.php` to boot the playground quickly.
- Call out intentionally skipped suites in commit/PR notes and ensure no generated files or runtime artifacts land in Git.

---

## Docs

- Write docs in `docs` folder. Follow [STYLE_GUIDE.md](STYLE_GUIDE.md) and [docs/contributions/documentation.md](docs/contributions/documentation.md). Keep README/docs in sync with behavior.
- The README is a quickstart; `docs/contributions/*` hold the detailed contributor guidance. Update both when you change commands or workflows.
- Typography: add non-breaking spaces after short sentence starters (1–2 characters like “It” or “A”), before short words at the end of a sentence, and within short two-part names (e.g., “Grommas Dietz”). For em dashes, use a thin space on each side (` — `).

---

## AI usage

- Treat this file as canonical. Per-assistant guides (Copilot) only add tool-specific prompting tips and should point back here.

# Agent guide

Repository guide for the Kirby Hidden Characters plugin.

## Kirby Hidden Characters rules

- **Keep it ready-to-install.** Composer and GitHub tag-archive installs must work without running `composer` or `npm`. Keep the committed Panel build outputs and bundled WOFF2.
- Plugin entry: `index.php` registers the compiled Panel assets; the plugin has no PHP runtime layer.
- Panel source: `src/index.js`, `src/styles/hidden-characters.css` and `src/fonts/hidden-characters.glyphs` build with `kirbyup` into `index.js`/`index.css`. The compiled WOFF2 lives in `assets/fonts/`.
- Derived fonts: `pnpm fonts:build` creates the foreground-only Writer font, the color-free textarea metrics font and their embedded CSS from the source WOFF2. Do not edit these outputs by hand. Asset checks require the [font-tooling environment](docs/contributions/setup.md#font-tooling).
- Playground: `playground/` is the self-contained Kirby site for integration and browser tests. Add the smallest useful fixtures under `playground/site/**`.
- Never wrap imports in `try/catch`.
- Static analysis: if PHP source files are added beyond `index.php`, include their directories in `psalm.xml.dist`; add suppressions only for concrete framework patterns that require them.
- Use `tests/bootstrap.php`, `tests/TestCase.php` and `tests/Support/TestEnvironment.php` to boot the playground quickly. Run `pnpm run test:browser` when Panel behavior changes.
- Write docs in `docs/` and update contributor documentation when development commands or workflows change. Call out intentionally skipped suites in commit or PR notes.

<!-- shared:kirby-plugin-workflow — identical in every Grommas Dietz Kirby plugin repository. Change it in kirby-plugin first, then copy it unchanged. -->

## Shared workflow

- Do not commit local state: credentials, environment files, accounts, sessions, caches, databases, test reports, local plugin links or installed dependencies.
- Committed Panel assets such as `index.js` and `index.css` are build output. Edit `src/`, rebuild with `pnpm run build` and commit the result.
- Use Conventional Commits and focused diffs. Keep source, tests, translations, documentation and generated assets aligned.
- Keep public classes, options, routes, commands, stored data and blueprint handles stable unless a change intentionally breaks them.
- Add regression coverage for fixes. Keep fixtures deterministic and fictional, and never contact real services in default tests.
- Panel copy uses sentences or commas. Avoid semicolons and centered dots as separators.
- Prefer Kirby's built-in Panel icons. Add namespaced Remix Icon glyphs only when Kirby has no suitable icon.
- Install with `composer run setup` and `pnpm run setup`. Before handing over changes, run `composer run verify` and `pnpm run verify`, or `pnpm run verify:all` where the repository defines it. Use the focused lint, Psalm, test and build commands while iterating.
- Keep the README a short user-facing quickstart. Follow [STYLE_GUIDE.md](STYLE_GUIDE.md) and the [documentation guidance](docs/contributions/documentation.md).
- This file is canonical. Assistants such as Copilot read it directly, so do not add per-assistant instruction files.

<!-- /shared:kirby-plugin-workflow -->

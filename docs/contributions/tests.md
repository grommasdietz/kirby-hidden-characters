# Tests

Run tests after PHP or Panel changes and add coverage for bug fixes.

> [!IMPORTANT]
> Complete the [Setup](./setup.md) steps first.

## Complete verification

```bash
composer run setup
pnpm run setup
pnpm run verify:all
```

The command prints one concise status per check, stops at the first failure, and shows the captured output only for that failed check. Browser tests use the compact dot reporter; open the full HTML report with `pnpm run test:browser:report`, or expose the verbose list reporter and raw PHP server logs with `pnpm run test:browser:debug`.

Do not enable `set -e` in an interactive shell.

## PHP

```bash
composer run verify
```

Target individual checks when debugging:

```bash
composer run lint
composer run psalm
composer run test:unit
composer run test:integration
composer run test:smoke
composer run test:coverage
composer run release:check
```

Use the shared `tests/TestCase.php` base class to boot Kirby with the playground roots. Add the smallest possible blueprint or content fixtures for new behavior.

## Panel, asset and browser checks

```bash
pnpm run build:check
pnpm run lint
pnpm run test:bundle
pnpm run test:assets
pnpm run test:archive
pnpm run docs:verify
pnpm run test:hygiene
pnpm run test:browser
```

`test:assets` verifies the hidden-character icon map, the foreground-color guard layers in the Glyphs source, deterministic Writer-font generation, and that both fonts' embedded WOFF2 payloads match their committed runtime files. Keep the [font-tooling environment](./setup.md#font-tooling) active for this check. `build:check` rebuilds the compiled Panel output and fails when committed files are stale.

Playwright creates a temporary `admin@kirby-hidden-characters.test` user with password `playwright`. Override it with `KIRBY_USER_EMAIL` and `KIRBY_USER_PASSWORD` when needed. Runtime accounts, sessions, cache and media are removed after the suite while Composer-installed plugin links and tracked content are preserved.

The default local suite uses Chromium. GitHub Actions runs Chromium, WebKit and Firefox. Run that same suite locally with:

```bash
pnpm exec playwright install webkit firefox
PLAYWRIGHT_CROSS_BROWSER=1 pnpm run test:browser
```

The alignment regressions cover plain, bold, italic, code, nested and custom marks; leading, consecutive and trailing NBSPs; and narrow viewports. They exercise both native ranges and injected empty boundary fragments to reproduce Safari's failure in every engine. Selection and editable-DOM checks run in all three engines; clipboard readback uses Chromium's supported permission API.

Keyboard regressions cover consecutive `Shift+Enter` breaks, initially empty Writers, paragraph and story-end placement, and typing or deleting text on the final empty line. Bold, italic and code cases cover break insertion and deletion, including Firefox's empty break rectangles inside code. Kirby's native inline-flex code layout may keep a trailing break on the same line; markers follow that layout. Textarea checks cover the same newline input with and without a toolbar; textareas display line-break markers without paragraph or story-end markers.

Color regressions sample actual screenshot pixels for code on light backgrounds, colored links and nested marks. They cover light/dark themes, hover and hover exit, inherited color overrides, configurable marker opacity and system color-scheme changes while focused. Structural markers are checked against their parent/paragraph color. Computed CSS alone does not prove that a color font painted the expected color.

Lifecycle regressions switch between Writers, change inherited colors while blurred, and refocus to verify a fresh render. Navigating away and back checks that media-query listeners are removed and each Writer receives exactly one overlay.

Before a release, also check a focused Writer in Safari with default, hovered and runtime-overridden link colors; code, nested and custom marks; light and dark themes; and the blurred state. Confirm visually that markers sit inside their whitespace, including bold, italic and code text, and that text on both sides of an NBSP keeps its color through focus, hover and theme changes. A real pointer check is required for `:hover`; WebDriver pointer actions do not consistently establish Safari's visual hover state.

## Troubleshooting

- If VS Code cannot resolve `@playwright/test`, run `pnpm install --frozen-lockfile`.
- If PHP or Kirby types are missing, run both `composer install` and `composer install -d playground`, then clear the language-server cache.
- For server-side browser failures, use `pnpm run test:browser:debug` rather than enabling permanent PHP access logs.

Next: Continue with [Documentation](./documentation.md)

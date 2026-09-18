# Setup

This plugin uses a Kirby site in `playground/` for integration and browser tests.

---

## Composer

Install Composer dependencies for the repo and the playground:

```bash
composer run setup
```

The root dependency graph contains PHPUnit, Psalm, PHP CS Fixer and Kirby for self-contained PHP quality checks. The separate playground graph provides the disposable application used by runtime and browser tests.

---

## Node

Install Node dependencies and the Playwright Chromium browser:

```bash
pnpm run setup
```

On Linux CI, install Chromium and its operating-system packages with `pnpm exec playwright install --with-deps chromium`.

## Font tooling

Character-asset verification requires Python 3.10+ and the pinned fontTools/Brotli dependencies. Create a temporary environment and keep it active while running the verification commands:

```bash
python3 -m venv "${TMPDIR:-/tmp}/kirby-hidden-characters-fonts"
. "${TMPDIR:-/tmp}/kirby-hidden-characters-fonts/bin/activate"
python -m pip install -r tools/requirements-fonts.txt
```

After exporting changes to the native-field font from Glyphs, regenerate its Writer derivative and embedded CSS, then rebuild the Panel assets:

```bash
pnpm fonts:build
pnpm build
pnpm test:assets
```

`fonts:check` regenerates the expected bytes in memory and checks both committed outputs without writing files. Generation preserves the source timestamp and verifies that all font tables except `COLR` and the `head` checksum remain byte-identical. Installation from Composer or a GitHub tag archive uses the committed assets and requires no Python or build tools.

---

## Panel dev server

Use the kirbyup dev server while iterating on Panel code:

```bash
pnpm dev
```

---

Next: Continue with [Structure](./structure.md)

## Psalm and Kirby compatibility

`composer psalm` prepares two installed Kirby collection docblocks with equivalent
nested conditional return types before analysis. This avoids the Psalm 6.17 parser
crash without pinning Psalm or changing executable Kirby code. The preparation is
idempotent and leaves annotations already fixed upstream unchanged. Remove
`tools/prepare-psalm.php` and its Composer script entry when both Kirby collection
classes ship compatible annotations.

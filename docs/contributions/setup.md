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

---

## Panel dev server

Use the kirbyup dev server while iterating on Panel code:

```bash
pnpm dev
```

---

Next: Continue with [Structure](./structure.md)

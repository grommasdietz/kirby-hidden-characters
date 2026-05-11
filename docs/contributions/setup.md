# Setup

This plugin uses a Kirby site in `playground/` for integration and browser tests.

---

## Composer

Install Composer dependencies for the repo and the playground:

```bash
composer run setup
```

> [!NOTE]
> If you install `vlucas/phpdotenv`, the PHPUnit bootstrap will load
> `playground/.env` for tests.

> [!NOTE]
> PHPUnit loads `vendor/autoload.php` by default. If you only install dependencies
> in `playground/`, the bootstrap loads `playground/vendor/autoload.php` as well.

---

## Node

Install Node dependencies and Playwright browsers (with system dependencies):

```bash
pnpm run setup
```

---

## Panel dev server

Use the kirbyup dev server while iterating on Panel code:

```bash
pnpm dev
```

---

Next: Continue with [Structure](./structure.md)

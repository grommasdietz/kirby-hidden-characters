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

`test:assets` verifies the hidden-character icon map and confirms that the embedded WOFF2 payload is byte-identical to the source font. `build:check` rebuilds the compiled Panel output and fails when committed files are stale.

Playwright creates a temporary `admin@kirby-hidden-characters.test` user with password `playwright`. Override it with `KIRBY_USER_EMAIL` and `KIRBY_USER_PASSWORD` when needed. Runtime accounts, sessions, cache and media are removed after the suite while Composer-installed plugin links and tracked content are preserved.

## Troubleshooting

- If VS Code cannot resolve `@playwright/test`, run `pnpm install --frozen-lockfile`.
- If PHP or Kirby types are missing, run both `composer install` and `composer install -d playground`, then clear the language-server cache.
- For server-side browser failures, use `pnpm run test:browser:debug` rather than enabling permanent PHP access logs.

Next: Continue with [Documentation](./documentation.md)

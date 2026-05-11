# Tests

Run tests after PHP or Panel changes and add coverage for bug fixes.

> [!IMPORTANT]
> Complete the [Setup](./setup.md) steps first.

---

## Quick sweep

Run the full lint/analysis/test set:

```bash
composer run verify
pnpm run verify
```

---

## PHP (PHPUnit)

```bash
composer test
```

Use the shared `tests/TestCase.php` base class to boot Kirby with the playground roots. It wraps `tests/Support/TestEnvironment.php` and lets you override config values when needed.

```php
final class ExampleTest extends TestCase
{
    public function testBootsKirby(): void
    {
        $kirby = $this->bootKirby(['options' => ['debug' => true]]);

        $this->assertSame('Kirby Playground', $kirby->site()->title()->value());
    }
}
```

When you need custom blueprints or content fixtures, add the smallest possible
files under `playground/site/` so tests stay fast to understand.

Targeted runs:

```bash
composer test:unit
composer test:integration
composer test -- --filter ExampleTest
```

Coverage (requires Xdebug or PCOV):

```bash
composer test:coverage
```

---

## Static analysis (Psalm)

```bash
composer psalm
```

---

## JS lint

```bash
pnpm lint
```

---

## Browser tests (Playwright)

First run (installs browser binaries with OS dependencies):

```bash
pnpm run setup
```

Run browser tests:

```bash
pnpm test:browser
```

### Configuration

Playwright starts a PHP server on a stable repo-specific localhost port by default. Override this with environment variables if needed:

- `PLAYWRIGHT_BASE_URL`: full URL (e.g. `http://localhost:3000`)
- `PLAYWRIGHT_WEB_PORT`: port number only
- `PLAYWRIGHT_REUSE_SERVER=1`: reuse an already running server on the same URL instead of starting a fresh one

### Panel login for browser tests

Playwright creates temporary Panel users before the suite and removes them afterwards.

**Admin user** (default):

- Email: `admin@kirby-hidden-characters.test`
- Password: `playwright`

Override with environment variables:

- `KIRBY_USER_EMAIL`
- `KIRBY_USER_PASSWORD`

Notes:

- Test user files are written to `playground/site/accounts`
- Playwright uses the built-in PHP server defined in `playwright.config.ts`
- Playwright does not load `.env` files automatically

You can also create/delete users manually during local debugging:

```bash
php tools/create-test-user.php --email "admin@kirby-hidden-characters.test" --password "playwright" --role=admin
php tools/create-test-user.php --delete --email "admin@kirby-hidden-characters.test"
```

---

## Fixtures

Keep fixtures under `playground/site/**` minimal and focused on the behavior under test. Avoid committing runtime data or caches.

### Troubleshooting

- **`Cannot find module '@playwright/test'` in VS Code**: run `pnpm install` and ensure you are not in production-only mode (check `NODE_ENV` and `pnpm config get production`).
- **Missing Kirby or PHPUnit types in the editor**: run `composer install` and `composer install -d playground`, then clear the Intelephense cache.

---

Next: Continue with [Documentation](./documentation.md)

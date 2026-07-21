<?php

declare(strict_types=1);

namespace GrommasDietz\HiddenCharacters\Tests\Support;

use Kirby\Cms\App;
use Kirby\Filesystem\Dir;
use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Prepares a Kirby instance that uses the playground as its site roots.
 * This helper keeps tests isolated from the Playwright fixtures and from
 * local user configuration.
 */
final class TestEnvironment
{
    private static mixed $prevErrorHandler = null;
    private static mixed $prevExceptionHandler = null;

    /**
     * Bootstraps a Kirby app configured for the playground installation.
     *
     * @param array<string,mixed> $overrides Provide Kirby config overrides for edge cases.
     */
    public static function boot(array $overrides = []): App
    {
        static::captureHandlers();
        static::destroyApp();

        $paths = static::resolvePaths();

        static::prepareContent($paths['playground'] . '/content');
        static::prepareCache($paths['cache']);
        static::prepareAccounts($paths['accounts']);
        static::preparePluginSandbox($paths['plugins']);

        $defaults = [
            'roots' => [
                'index'   => $paths['playground'],
                'plugins' => $paths['plugins'],
                'accounts' => $paths['accounts'],
            ],
            'options' => [
                'debug'  => false,
                'whoops' => false,
                'error'  => false,
                'cache'  => [
                    'pages' => [
                        'type' => 'file',
                        'root' => $paths['cache'] . '/pages',
                    ],
                ],
            ],
        ];

        $config = array_replace_recursive($defaults, $overrides);

        // First establish the App singleton and playground roots. Plugin entry
        // files can then resolve options, blueprints and other installation state.
        new App($config);

        // Load plugin entry files with plain require on every boot. Kirby's normal
        // loader uses require_once; after App::destroy() that would leave the static
        // plugin registry empty for later PHPUnit tests in the same PHP process.
        static::registerPlugins([$paths['project']]);

        // Rebuild the App so all freshly registered extensions are applied through
        // Kirby's normal constructor flow before options are baked.
        $app = new App($config);

        static::seedUsers($app);

        static::restoreHandlers();

        return $app;
    }

    /**
     * Restores error/exception handlers to their state before boot().
     * Called from TestCase::tearDown() to avoid handler leaks between tests.
     */
    public static function cleanup(): void
    {
        static::destroyApp();

        $paths = static::resolvePaths();
        Dir::remove($paths['cache']);
        Dir::remove($paths['accounts']);
        Dir::remove($paths['plugins']);
        Dir::make($paths['plugins'], true);
        touch($paths['plugins'] . '/.gitkeep');
    }

    public static function restoreHandlers(): void
    {
        $maxRestoreSteps = 10;
        for ($step = 0; $step < $maxRestoreSteps; $step++) {
            $currentErrorHandler = set_error_handler(static fn () => false);
            restore_error_handler();

            if ($currentErrorHandler === static::$prevErrorHandler) {
                break;
            }

            restore_error_handler();
        }

        $maxRestoreSteps = 10;
        for ($step = 0; $step < $maxRestoreSteps; $step++) {
            $currentExceptionHandler = set_exception_handler(static fn () => false);
            restore_exception_handler();

            if ($currentExceptionHandler === static::$prevExceptionHandler) {
                break;
            }

            restore_exception_handler();
        }
    }

    private static function captureHandlers(): void
    {
        $prevErrorHandler = set_error_handler(static fn () => false);
        restore_error_handler();

        $prevExceptionHandler = set_exception_handler(static fn () => false);
        restore_exception_handler();

        static::$prevErrorHandler = $prevErrorHandler;
        static::$prevExceptionHandler = $prevExceptionHandler;
    }

    /**
     * @return array{project:string, playground:string, cache:string, plugins:string, accounts:string}
     */
    private static function resolvePaths(): array
    {
        $testsRoot = realpath(__DIR__ . '/..');
        if ($testsRoot === false) {
            throw new \RuntimeException('Unable to resolve tests directory');
        }

        $projectRoot = realpath($testsRoot . '/..');
        if ($projectRoot === false) {
            throw new \RuntimeException('Unable to resolve project root');
        }

        $playgroundRoot = realpath($projectRoot . '/playground');
        if ($playgroundRoot === false) {
            throw new \RuntimeException('Playground root missing for tests');
        }

        return [
            'project'   => $projectRoot,
            'playground' => $playgroundRoot,
            'cache'     => $playgroundRoot . '/site/cache',
            'plugins'   => $projectRoot . '/tests/.plugins',
            'accounts'  => $playgroundRoot . '/site/accounts',
        ];
    }

    private static function prepareCache(string $cacheRoot): void
    {
        Dir::remove($cacheRoot);
        Dir::make($cacheRoot . '/pages', true);
    }

    /**
     * Removes generated content version folders (e.g. `_changes`) from the playground.
     * Those often contain `Lock:` fields which become "fresh" on checkout and will
     * break tests by triggering content locking.
     */
    private static function prepareContent(string $contentRoot): void
    {
        if (is_dir($contentRoot) === false) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($contentRoot, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isDir() && $item->getFilename() === '_changes') {
                Dir::remove($item->getPathname());
                continue;
            }

            // Legacy lock file
            if ($item->isFile() && $item->getFilename() === '.lock') {
                @unlink($item->getPathname());
            }
        }
    }

    private static function prepareAccounts(string $accountsRoot): void
    {
        if (is_dir($accountsRoot) === false) {
            Dir::make($accountsRoot, true);
        }
    }

    private static function preparePluginSandbox(string $pluginsRoot): void
    {
        Dir::remove($pluginsRoot);
        Dir::make($pluginsRoot, true);
        touch($pluginsRoot . '/.gitkeep');
    }

    /**
     * @param list<string> $pluginSources Absolute plugin source directories.
     */
    private static function registerPlugins(array $pluginSources): void
    {
        foreach (array_values(array_unique($pluginSources)) as $source) {
            $entry = rtrim($source, '/\\') . '/index.php';

            if (is_file($entry) === false) {
                throw new \RuntimeException('Plugin entry file missing: ' . $entry);
            }

            require $entry;
        }
    }

    private static function seedUsers(App $app): void
    {
        if ($app->users()->count() > 0) {
            return;
        }

        $app->impersonate('kirby');

        $app->users()->create([
            'email' => 'admin@kirby-hidden-characters.test',
            'name' => 'Test Admin',
            'role' => 'admin',
            'password' => 'playwright',
            'language' => 'en',
        ]);

        $app->impersonate(null);
    }

    private static function destroyApp(): void
    {
        App::destroy();
    }
}

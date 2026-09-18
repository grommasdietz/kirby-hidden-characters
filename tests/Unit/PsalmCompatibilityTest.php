<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class PsalmCompatibilityTest extends TestCase
{
    public function testPreparationOnlyChangesKnownDocblocksAndIsIdempotent(): void
    {
        $root = sys_get_temp_dir() . '/kirby-psalm-' . bin2hex(random_bytes(8));
        $files = [];
        $directories = ['tools', 'vendor', 'kirby/src/Toolkit', 'kirby/src/Cms'];
        foreach ($directories as $directory) {
            mkdir($root . '/' . $directory, 0777, true);
        }

        $original = '@psalm-return ($offset is 0 && $limit is null ? $this : static)';
        $compatible = '@psalm-return ($offset is 0 ? ($limit is null ? $this : static) : static)';
        $fixture = "<?php\n/** " . $original . " */\nfunction example(): int { return 42; }\n";
        $script = $root . '/tools/prepare-psalm.php';
        $files[] = $script;
        copy(dirname(__DIR__, 2) . '/tools/prepare-psalm.php', $script);
        $files[] = $root . '/vendor/autoload.php';
        file_put_contents($root . '/vendor/autoload.php', '<?php namespace Composer; class InstalledVersions { public static function getInstallPath($package) { return dirname(__DIR__) . "/kirby"; } }');
        $targets = [$root . '/kirby/src/Toolkit/Collection.php', $root . '/kirby/src/Cms/LazyCollection.php'];
        foreach ($targets as $target) {
            $files[] = $target;
            file_put_contents($target, $fixture);
        }

        try {
            $run = static function () use ($script): void {
                exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($script), $output, $exitCode);
                self::assertSame(0, $exitCode, implode("\n", $output));
            };
            $run();
            foreach ($targets as $target) {
                self::assertSame(str_replace($original, $compatible, $fixture), file_get_contents($target));
            }
            $run();
            foreach ($targets as $target) {
                self::assertSame(str_replace($original, $compatible, $fixture), file_get_contents($target));
            }

            // An upstream replacement must remain untouched, including its code.
            $upstream = "<?php\n/** @psalm-return static */\nfunction example(): int { return 42; }\n";
            foreach ($targets as $target) {
                file_put_contents($target, $upstream);
            }
            $run();
            foreach ($targets as $target) {
                self::assertSame($upstream, file_get_contents($target));
            }
        } finally {
            foreach (array_reverse($files) as $file) {
                unlink($file);
            }
            foreach (['kirby/src/Toolkit', 'kirby/src/Cms', 'kirby/src', 'kirby', 'vendor', 'tools', ''] as $directory) {
                rmdir($root . '/' . $directory);
            }
        }
    }
}

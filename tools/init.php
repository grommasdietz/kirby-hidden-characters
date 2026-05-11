#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$configPath = __DIR__ . '/init-config.json';

$defaults = [
    'slug'   => 'grommasdietz/kirby-hidden-characters',
    'title'  => 'Kirby Hidden Characters',
    'handle' => 'grommasdietz/hidden-characters',
];

$current = $defaults;
if (is_file($configPath)) {
    $decoded = json_decode((string) file_get_contents($configPath), true);
    if (is_array($decoded)) {
        $current = array_merge($current, array_intersect_key($decoded, $defaults));
    }
}

$options = getopt('', ['license::', 'version::', 'no-setup', 'help::']);

if (isset($options['help'])) {
    usage();
}

$licenseOption = isset($options['license']) ? trim((string) $options['license']) : null;
$versionOverride = isset($options['version']) ? trim((string) $options['version']) : null;
$skipSetup = array_key_exists('no-setup', $options);
$rootFolder = basename($root);
$derivedPackage = derivePackageFromFolder($rootFolder);
$defaultVendor = 'grommasdietz';
$newSlug = $defaultVendor . '/' . $derivedPackage;
$shortName = deriveShortName($derivedPackage);
$newTitle = deriveTitleFromPackage($derivedPackage);

if (preg_match('~^[a-z0-9_.-]+/[a-z0-9_.-]+$~i', $newSlug) !== 1) {
    usage("Slug must be in vendor/package format (e.g. acme/gallery).");
}

[$newVendor, $newPackage] = explode('/', $newSlug, 2);
$newHandle = deriveHandle($newVendor, $newPackage);
$newVersion = resolveVersion($versionOverride);

$oldSlug = $current['slug'];
$oldTitle = $current['title'];
$oldHandle = $current['handle'];
[$oldVendor, $oldPackage] = explode('/', $oldSlug, 2);
$oldNamespace = resolveCurrentNamespace($root, $oldVendor, $oldPackage);
$newNamespace = deriveNamespace($newVendor, $shortName);

$replacements = buildReplacements(
    [
        'slug'        => $oldSlug,
        'title'       => $oldTitle,
        'handle'      => $oldHandle,
        'package'     => $oldPackage,
        'vendor'      => $oldVendor,
        'namespace'   => $oldNamespace,
    ],
    [
        'slug'    => $newSlug,
        'title'   => $newTitle,
        'handle'  => $newHandle,
        'package' => $newPackage,
        'vendor'  => $newVendor,
        'namespace' => $newNamespace,
    ]
);

[$filesUpdated, $occurrences] = applyReplacements($root, $replacements);

require_once __DIR__ . '/switch-license.php';
switchLicense($root, $licenseOption);

updatePackageJson($root . '/package.json', $newVendor, $newPackage, $newVersion);
updateComposerJson($root . '/composer.json', $newSlug);
removeLockfiles($root);

if ($skipSetup === false) {
    runSetupCommands($root);
}

file_put_contents(
    $configPath,
    json_encode(
        [
            'slug'   => $newSlug,
            'title'  => $newTitle,
            'handle' => $newHandle,
        ],
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    ) . PHP_EOL
);

printf(
    "Updated %d files (%d replacements). Current values:%s- slug: %s%s- title: %s%s- handle: %s%s",
    $filesUpdated,
    $occurrences,
    PHP_EOL,
    $newSlug,
    PHP_EOL,
    $newTitle,
    PHP_EOL,
    $newHandle,
    PHP_EOL
);

printf(
    "Next steps:%s- Run composer run setup and pnpm run setup to regenerate lock files and metadata%s- Update README or docs manually where branding changes are unique%s",
    PHP_EOL,
    PHP_EOL,
    PHP_EOL
);

function usage(?string $message = null): void
{
    if ($message !== null) {
        fwrite(STDERR, $message . PHP_EOL);
    }

    fwrite(
        STDERR,
        <<<TXT
Usage: php tools/init.php [--license=mit|commercial] [--version=x.y.z] [--no-setup]

TXT
    );

    exit(1);
}

function derivePackageFromFolder(string $folder): string
{
    $normalized = preg_replace('/[^a-z0-9_.-]+/i', '-', $folder) ?? $folder;
    $normalized = strtolower(trim($normalized, '-'));

    return $normalized !== '' ? $normalized : $folder;
}

function deriveHandle(string $vendor, string $package): string
{
    $handlePackage = preg_replace('/^kirby-/i', '', $package) ?? $package;
    $handlePackage = trim($handlePackage, '-');

    if ($handlePackage === '') {
        $handlePackage = $package;
    }

    return $vendor . '/' . $handlePackage;
}

function deriveShortName(string $package): string
{
    $stripped = preg_replace('/^(gd|kirby)-/i', '', $package) ?? $package;
    $stripped = strtolower(ltrim($stripped, '-'));

    return $stripped !== '' ? $stripped : $package;
}

function deriveTitleFromPackage(string $package): string
{
    $normalized = strtolower($package);
    $titleBody = deriveTitleFromShortName(deriveShortName($normalized));

    if (str_starts_with($normalized, 'gd-')) {
        return 'GD ' . $titleBody;
    }

    if (str_starts_with($normalized, 'kirby-')) {
        return 'Kirby ' . $titleBody;
    }

    return $titleBody;
}

function deriveTitleFromShortName(string $shortName): string
{
    $normalized = str_replace(['-', '_', '.'], ' ', $shortName);

    return ucwords($normalized);
}

function resolveVersion(?string $override): string
{
    if ($override !== null && $override !== '') {
        return $override;
    }

    return '0.1.0';
}

function deriveNamespace(string $vendor, string $package): string
{
    $vendorNamespace = resolveVendorNamespace($vendor);

    return $vendorNamespace . '\\' . studly($package) . '\\';
}

function resolveVendorNamespace(string $vendor): string
{
    $normalized = strtolower($vendor);

    if ($normalized === 'grommasdietz') {
        return 'GrommasDietz';
    }

    return studly($vendor);
}

function escapeNamespace(string $namespace): string
{
    return str_replace('\\', '\\\\', $namespace);
}

function resolveCurrentNamespace(string $root, string $vendor, string $package): string
{
    $composerFile = $root . '/composer.json';

    if (is_file($composerFile)) {
        $decoded = json_decode((string) file_get_contents($composerFile), true);

        if (is_array($decoded) && isset($decoded['autoload']['psr-4']) && is_array($decoded['autoload']['psr-4'])) {
            $prefixes = array_keys($decoded['autoload']['psr-4']);
            $current = $prefixes[0] ?? null;

            if (is_string($current) && $current !== '') {
                return rtrim($current, '\\') . '\\';
            }
        }
    }

    return deriveNamespace($vendor, $package);
}

function buildReplacements(array $old, array $new): array
{
    $map = [];

    $oldRepo = 'https://github.com/' . $old['slug'];
    $newRepo = 'https://github.com/' . $new['slug'];

    $map[$oldRepo] = $newRepo;
    $map[$oldRepo . '.git'] = $newRepo . '.git';
    $map[$old['slug']] = $new['slug'];
    $map[$old['title']] = $new['title'];
    $map[$old['handle']] = $new['handle'];
    $map[$old['namespace']] = $new['namespace'];
    $map[escapeNamespace($old['namespace'])] = escapeNamespace($new['namespace']);

    // Boilerplate test namespace (differs from the PSR-4 namespace)
    $map['GrommasDietz\\HiddenCharacters\\Tests\\'] = $new['namespace'] . 'Tests\\';
    $map[escapeNamespace('GrommasDietz\\HiddenCharacters\\Tests\\')] = escapeNamespace($new['namespace'] . 'Tests\\');

    if (str_starts_with($old['package'], 'gd-') || str_starts_with($old['package'], 'kirby-')) {
        $map[$old['package']] = $new['package'];
    }

    $map['site/plugins/' . $old['package']] = 'site/plugins/' . $new['package'];
    $map['/.plugins/' . $old['package']] = '/.plugins/' . $new['package'];
    $map['/' . $old['package']] = '/' . $new['package'];
    $map[$old['package'] . '.test'] = $new['package'] . '.test';
    $map['/kirby-hidden-characters'] = '/' . $new['package'];
    $map['kirby-hidden-characters.test'] = $new['package'] . '.test';

    return $map;
}

function applyReplacements(string $root, array $replacements): array
{
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
    );

    $skip = [
        '.git',
        'node_modules',
        'vendor',
        'playground/kirby',
        'playground/media',
        'playground/site/plugins',
        'tests/.plugins',
    ];

    $filesUpdated = 0;
    $occurrences = 0;

    /** @var SplFileInfo $file */
    foreach ($iterator as $file) {
        if ($file->isDir() || $file->isLink()) {
            continue;
        }

        $relative = str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1));
        if (shouldSkip($relative, $skip)) {
            continue;
        }

        $contents = file_get_contents($file->getPathname());
        if ($contents === false) {
            continue;
        }

        $count = 0;
        $updated = str_replace(array_keys($replacements), array_values($replacements), $contents, $count);

        if ($count > 0) {
            file_put_contents($file->getPathname(), $updated);
            $filesUpdated++;
            $occurrences += $count;
        }
    }

    return [$filesUpdated, $occurrences];
}

function shouldSkip(string $relativePath, array $skipDirs): bool
{
    foreach ($skipDirs as $dir) {
        if ($relativePath === $dir || str_starts_with($relativePath, $dir . '/')) {
            return true;
        }
    }

    return false;
}

function studly(string $value): string
{
    $parts = preg_split('/[^a-zA-Z0-9]+/', $value, flags: PREG_SPLIT_NO_EMPTY);

    if ($parts === false || count($parts) === 0) {
        return ucfirst($value);
    }

    return implode(
        '',
        array_map(
            static fn (string $part): string => ucfirst(strtolower($part)),
            $parts
        )
    );
}

function updatePackageJson(string $path, string $vendor, string $package, string $version): void
{
    updateJsonFile($path, static function (array $decoded) use ($vendor, $package, $version): array {
        $decoded['name'] = $package;
        $decoded['version'] = $version;

        return $decoded;
    });
}

function updateComposerJson(string $path, string $slug): void
{
    updateJsonFile($path, static function (array $decoded) use ($slug): array {
        $decoded['name'] = $slug;
        unset($decoded['version']);

        return $decoded;
    });
}

function updateJsonFile(string $path, callable $mutator): void
{
    if (!is_file($path)) {
        return;
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        return;
    }

    $updated = $mutator($decoded);

    file_put_contents(
        $path,
        json_encode($updated, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL
    );
}

function removeLockfiles(string $root): void
{
    $paths = [
        $root . '/composer.lock',
        $root . '/playground/composer.lock',
    ];

    foreach ($paths as $path) {
        if (is_file($path)) {
            unlink($path);
        }
    }
}

function runSetupCommands(string $root): void
{
    $commands = [
        'composer run setup',
        'pnpm run setup',
    ];

    foreach ($commands as $command) {
        if (!commandExists($command)) {
            fwrite(STDERR, "Skipping {$command}: command not available.\n");
            continue;
        }

        $exitCode = runCommand($command, $root);
        if ($exitCode !== 0) {
            fwrite(STDERR, "Command failed ({$exitCode}): {$command}\n");
        }
    }
}

function commandExists(string $command): bool
{
    $binary = explode(' ', $command)[0] ?? '';
    if ($binary === '') {
        return false;
    }

    $resolved = shell_exec('command -v ' . escapeshellarg($binary));

    return is_string($resolved) && trim($resolved) !== '';
}

function runCommand(string $command, string $root): int
{
    $descriptor = [
        0 => STDIN,
        1 => STDOUT,
        2 => STDERR,
    ];

    $process = proc_open($command, $descriptor, $pipes, $root);
    if (!is_resource($process)) {
        return 1;
    }

    return proc_close($process);
}

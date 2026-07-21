#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$errors = [];

function readJson(string $path, array &$errors): ?array
{
    if (!is_file($path)) {
        $errors[] = 'Missing required file: ' . basename($path);
        return null;
    }

    try {
        $value = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        $errors[] = basename($path) . ' is invalid JSON: ' . $exception->getMessage();
        return null;
    }

    if (!is_array($value)) {
        $errors[] = basename($path) . ' must contain a JSON object.';
        return null;
    }

    return $value;
}

function isSemver(mixed $version): bool
{
    return is_string($version)
        && preg_match('/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/', $version) === 1;
}

function minimumCaretVersion(mixed $constraint): ?array
{
    if (!is_string($constraint) || preg_match('/^\^(\d+)\.(\d+)/', $constraint, $matches) !== 1) {
        return null;
    }

    return [(int) $matches[1], (int) $matches[2]];
}

function latestSemverTag(string $root): ?string
{
    exec(
        'git -C ' . escapeshellarg($root) . ' tag --list ' . escapeshellarg('v[0-9]*') . ' --sort=-v:refname 2>/dev/null',
        $tags,
        $exitCode,
    );

    if ($exitCode !== 0) {
        return null;
    }

    foreach ($tags as $tag) {
        $version = ltrim(trim($tag), 'v');
        if (isSemver($version)) {
            return $version;
        }
    }

    return null;
}

foreach ([
    '.gitattributes',
    '.releaserc',
    'CHANGELOG.md',
    'LICENSE.md',
    'README.md',
    'THIRD_PARTY_NOTICES.md',
    'composer.json',
    'composer.lock',
    'index.php',
    'package.json',
    'phpunit.xml.dist',
    'tools/set-version.mjs',
] as $file) {
    if (!is_file($root . '/' . $file)) {
        $errors[] = "Missing required file: {$file}";
    }
}

$composer = readJson($root . '/composer.json', $errors);
$package = readJson($root . '/package.json', $errors);
$release = readJson($root . '/.releaserc', $errors);
$playground = readJson($root . '/playground/composer.json', $errors);

$composerVersion = $composer['version'] ?? null;
$packageVersion = $package['version'] ?? null;

if (!isSemver($composerVersion)) {
    $errors[] = 'composer.json must define a valid version for Kirby update checks.';
}
if (!isSemver($packageVersion)) {
    $errors[] = 'package.json must define a valid synchronized release version.';
}
if (is_string($composerVersion) && is_string($packageVersion) && $composerVersion !== $packageVersion) {
    $errors[] = 'composer.json and package.json versions must match.';
}

if ($composer !== null) {
    if (($composer['type'] ?? null) !== 'kirby-plugin') {
        $errors[] = 'composer.json type must be kirby-plugin.';
    }
    if (!isset($composer['require']['getkirby/composer-installer'])) {
        $errors[] = 'composer.json must require getkirby/composer-installer.';
    }
    $links = [
        $composer['homepage'] ?? null,
        $composer['support']['docs'] ?? null,
        $composer['support']['source'] ?? null,
    ];
    if (array_filter($links, 'is_string') === []) {
        $errors[] = 'composer.json must provide a homepage or support link for Kirby System view.';
    }
}

if ($package !== null) {
    if (($package['private'] ?? false) !== true) {
        $errors[] = 'package.json must remain private because it is tooling-only.';
    }
    if (preg_match('/^pnpm@11\./', (string) ($package['packageManager'] ?? '')) !== 1) {
        $errors[] = 'packageManager must use the shared pnpm 11 baseline.';
    }
    if (($package['engines']['node'] ?? null) !== '>=22.14 <23') {
        $errors[] = 'package.json must select Node 22.14 or newer within the shared Node 22 tooling major.';
    }
}

if (trim((string) @file_get_contents($root . '/.node-version')) !== '22') {
    $errors[] = '.node-version must select Node 22.';
}

if ($composer !== null && $playground !== null) {
    $rootMinimum = minimumCaretVersion($composer['require']['php'] ?? null);
    $playgroundMinimum = minimumCaretVersion($playground['require']['php'] ?? null);
    if ($rootMinimum !== null && $playgroundMinimum !== null && $playgroundMinimum < $rootMinimum) {
        $errors[] = 'The playground PHP minimum must not be lower than the plugin minimum.';
    }

    if ($rootMinimum !== null) {
        $expectedPlatform = sprintf('%d.%d.0', $rootMinimum[0], $rootMinimum[1]);
        $playgroundPlatform = $playground['config']['platform']['php'] ?? null;

        if ($playgroundPlatform !== $expectedPlatform) {
            $errors[] = "playground/config.platform.php must pin {$expectedPlatform} so the runtime lock is resolved against the declared minimum.";
        }
    }
}

if (is_file($root . '/phpunit.dist.xml')) {
    $errors[] = "Use PHPUnit's auto-discovered phpunit.xml.dist name, not phpunit.dist.xml.";
}

if (is_file($root . '/.gitmessage')) {
    $errors[] = '.gitmessage must not inject a commit template.';
}
if (str_contains((string) @file_get_contents($root . '/.vscode/settings.json'), 'commitMessageGeneration.instructions')) {
    $errors[] = 'VS Code must not inject commit-message instructions.';
}

if ($release !== null) {
    $encoded = (string) json_encode($release, JSON_UNESCAPED_SLASHES);
    foreach ([
        '@semantic-release/changelog',
        '@semantic-release/exec',
        '@semantic-release/git',
        '@semantic-release/github',
        'tools/set-version.mjs',
    ] as $expected) {
        if (!str_contains($encoded, $expected)) {
            $errors[] = ".releaserc is missing {$expected}.";
        }
    }
    if (str_contains($encoded, 'package-release') || preg_match('/\.zip(?:"|\\")/i', $encoded) === 1) {
        $errors[] = 'Do not upload a redundant custom source ZIP; use GitHub tag archives.';
    }
}

if (is_file($root . '/tools/package-release.mjs') || is_dir($root . '/tools/templates/distribution')) {
    $errors[] = 'Legacy custom ZIP distribution tooling must be removed.';
}

$initConfigPath = $root . '/tools/init-config.json';
$initConfig = is_file($initConfigPath) ? readJson($initConfigPath, $errors) : null;
if (is_array($initConfig) && array_key_exists('version', $initConfig)) {
    $errors[] = 'tools/init-config.json must not duplicate the manifest version.';
}
$isTemplate = is_array($initConfig) && ($initConfig['initialized'] ?? null) === false;

if (!$isTemplate && is_string($composerVersion)) {
    $latestTag = latestSemverTag($root);
    if ($latestTag !== null && version_compare($composerVersion, $latestTag, '<')) {
        $errors[] = "Manifest version {$composerVersion} is older than latest Git tag v{$latestTag}.";
    }
}

if (!$isTemplate) {
    foreach ([
        'TEMPLATE_SETUP.md',
        'licenses',
        'tools/cleanup-template.php',
        'tools/init-config.json',
        'tools/init.php',
        'tools/switch-license.php',
    ] as $templatePath) {
        if (file_exists($root . '/' . $templatePath) || is_link($root . '/' . $templatePath)) {
            $errors[] = "Template-only path must be removed before release: {$templatePath}";
        }
    }
}

if ($errors !== []) {
    fwrite(STDERR, "Release readiness failed:\n");
    foreach (array_unique($errors) as $error) {
        fwrite(STDERR, " - {$error}\n");
    }
    exit(1);
}

fwrite(STDOUT, "Release readiness checks passed.\n");

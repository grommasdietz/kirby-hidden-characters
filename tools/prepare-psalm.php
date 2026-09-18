<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

// Psalm does not support && in conditional types and 6.17 crashes on it.
// Keep Kirby's return type precise with equivalent nested conditionals.
// Only these two docblocks are changed; Kirby's runtime code is untouched.
// Remove once Kirby ships compatible annotations in both collection classes.
// Upstream parser issue: https://github.com/vimeo/psalm/pull/11914
$kirby = Composer\InstalledVersions::getInstallPath('getkirby/cms');
if ($kirby === null) {
    throw new RuntimeException('Install the root Composer dependencies before running Psalm.');
}

$original = '@psalm-return ($offset is 0 && $limit is null ? $this : static)';
$compatible = '@psalm-return ($offset is 0 ? ($limit is null ? $this : static) : static)';

foreach (['src/Toolkit/Collection.php', 'src/Cms/LazyCollection.php'] as $relativePath) {
    $path = $kirby . '/' . $relativePath;
    $source = file_get_contents($path);
    if ($source === false) {
        throw new RuntimeException('Cannot read Kirby source: ' . $path);
    }

    // Already prepared or fixed upstream: leave the installed file as it is.
    if (str_contains($source, $original) === false) {
        continue;
    }

    $updated = str_replace($original, $compatible, $source);
    if (file_put_contents($path, $updated) !== strlen($updated)) {
        throw new RuntimeException('Cannot prepare Kirby annotations: ' . $path);
    }
}

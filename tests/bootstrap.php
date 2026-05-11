<?php

declare(strict_types=1);

/**
 * PHPUnit bootstrap for Kirby plugin tests.
 *
 * This file:
 * - Loads Composer autoloading
 * - Registers the playground-aware TestEnvironment helper
 * - Exposes the shared PHPUnit base TestCase
 */

$rootAutoload = __DIR__ . '/../vendor/autoload.php';
$playgroundAutoload = __DIR__ . '/../playground/vendor/autoload.php';

if (is_file($rootAutoload)) {
    require_once $rootAutoload;
}

if (!class_exists('Kirby\\Filesystem\\Dir') && is_file($playgroundAutoload)) {
    require_once $playgroundAutoload;
}

if (!class_exists('Kirby\\Filesystem\\Dir') && !is_file($rootAutoload)) {
    throw new \RuntimeException(
        'Composer autoload not found. Run composer install (root or playground).'
    );
}

if (!class_exists('Kirby\\Filesystem\\Dir')) {
    throw new \RuntimeException(
        'Kirby classes not found. Run composer install -d playground.'
    );
}
require_once __DIR__ . '/Support/TestEnvironment.php';
require_once __DIR__ . '/TestCase.php';

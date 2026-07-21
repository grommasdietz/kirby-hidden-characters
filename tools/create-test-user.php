#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Small helper to create or delete a Panel user for automated tests.
 *
 * Usage:
 *   php tools/create-test-user.php                   # creates default admin user
 *   php tools/create-test-user.php --delete          # deletes default user if present
 *   php tools/create-test-user.php --email=... --password=... --name="Panel User" --role=editor
 *
 * You can also set environment variables:
 *   KIRBY_USER_EMAIL
 *   KIRBY_USER_PASSWORD
 *   KIRBY_USER_NAME
 *   KIRBY_USER_ROLE
 */

$rootAutoload = __DIR__ . '/../vendor/autoload.php';
$playgroundAutoload = __DIR__ . '/../playground/vendor/autoload.php';

if (is_file($rootAutoload)) {
    require_once $rootAutoload;
}

if (!class_exists('Kirby\\Filesystem\\Dir') && is_file($playgroundAutoload)) {
    require_once $playgroundAutoload;
}

if (!class_exists('Kirby\\Filesystem\\Dir')) {
    fwrite(
        STDERR,
        "Composer autoload not found. Run composer install (root or playground).\n"
    );
    exit(1);
}

require __DIR__ . '/../tests/Support/TestEnvironment.php';

use GrommasDietz\HiddenCharacters\Tests\Support\TestEnvironment;

$options = getopt(
    '',
    [
        'email::',
        'password::',
        'name::',
        'role::',
        'delete',
    ]
);

$value = static function (mixed $option, string $environment, string $fallback): string {
    if (is_string($option) && trim($option) !== '') {
        return trim($option);
    }

    $env = getenv($environment);
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }

    return $fallback;
};

$email = $value($options['email'] ?? null, 'KIRBY_USER_EMAIL', 'admin@kirby-hidden-characters.test');
$password = $value($options['password'] ?? null, 'KIRBY_USER_PASSWORD', 'playwright');
$name = $value($options['name'] ?? null, 'KIRBY_USER_NAME', 'Test Admin');
$role = $value($options['role'] ?? null, 'KIRBY_USER_ROLE', 'admin');
$delete = array_key_exists('delete', $options);

$kirby = TestEnvironment::boot();
$kirby->impersonate('kirby');

$user = $kirby->user($email);

if ($delete) {
    if ($user !== null) {
        try {
            $user->delete();
            fwrite(STDOUT, "Deleted user {$email}\n");
        } catch (\Kirby\Exception\LogicException $e) {
            // Can't delete last admin - that's fine for CI teardown
            fwrite(STDOUT, "Skipped deleting {$email}: {$e->getMessage()}\n");
        }
    } else {
        fwrite(STDOUT, "User {$email} not found; nothing to delete\n");
    }

    exit(0);
}

if ($user !== null) {
    // Update existing user's password to ensure it matches what tests expect
    // (can't delete+recreate because Kirby prevents deleting the last admin)
    $user->changePassword($password);
    fwrite(STDOUT, "Updated password for existing user {$email}\n");
    exit(0);
}

$kirby->users()->create([
    'email' => $email,
    'name' => $name,
    'role' => $role,
    'password' => $password,
]);

fwrite(STDOUT, "Created user {$email}\n");

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
 *   KIRBY_TEST_USER_EMAIL
 *   KIRBY_TEST_USER_PASSWORD
 *   KIRBY_TEST_USER_NAME
 *   KIRBY_TEST_USER_ROLE
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

$envEmail = getenv('KIRBY_USER_EMAIL');
$emailOption = $options['email'] ?? null;
$passwordOption = $options['password'] ?? null;
$nameOption = $options['name'] ?? null;
$roleOption = $options['role'] ?? null;

if ($emailOption === false) {
    $emailOption = null;
}

if ($passwordOption === false) {
    $passwordOption = null;
}

if ($nameOption === false) {
    $nameOption = null;
}

if ($roleOption === false) {
    $roleOption = null;
}

$email = $emailOption
    ?? ($envEmail !== false ? $envEmail : null)
    ?? 'user@kirby-hidden-characters.test';
$password = $passwordOption
    ?? getenv('KIRBY_USER_PASSWORD')
    ?? 'secret';
$name = $nameOption
    ?? getenv('KIRBY_TEST_USER_NAME')
    ?? 'Test User';
$role = $roleOption
    ?? getenv('KIRBY_TEST_USER_ROLE')
    ?? 'admin';
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

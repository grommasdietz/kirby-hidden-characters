#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);

$reset = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/reset-playground.php');
passthru($reset, $resetCode);
if ($resetCode !== 0) {
    exit($resetCode);
}

$email = getenv('KIRBY_USER_EMAIL') ?: 'admin@kirby-hidden-characters.test';
$password = getenv('KIRBY_USER_PASSWORD') ?: 'playwright';
$name = getenv('KIRBY_USER_NAME') ?: 'Test Admin';
$role = getenv('KIRBY_USER_ROLE') ?: 'admin';

$create = sprintf(
    '%s %s --email=%s --password=%s --name=%s --role=%s',
    escapeshellarg(PHP_BINARY),
    escapeshellarg(__DIR__ . '/create-test-user.php'),
    escapeshellarg($email),
    escapeshellarg($password),
    escapeshellarg($name),
    escapeshellarg($role)
);

passthru($create, $createCode);
exit($createCode);

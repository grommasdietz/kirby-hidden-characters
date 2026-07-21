<?php

declare(strict_types=1);

$autoload = __DIR__ . '/../vendor/autoload.php';

if (!is_file($autoload)) {
    throw new RuntimeException('Root Composer autoload not found. Run composer install.');
}

require_once $autoload;
require_once __DIR__ . '/Support/TestEnvironment.php';
require_once __DIR__ . '/TestCase.php';

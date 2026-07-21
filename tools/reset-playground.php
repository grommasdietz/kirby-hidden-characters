#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$resetPlugins = in_array('--plugins', $argv, true);
$targets = [
    $root . '/playground/media',
    $root . '/playground/site/accounts',
    $root . '/playground/site/cache',
    $root . '/playground/site/logs',
    $root . '/playground/site/sessions',
];

function removeTree(string $path): void
{
    if (!file_exists($path) && !is_link($path)) {
        return;
    }

    if (is_link($path) || is_file($path)) {
        unlink($path);
        return;
    }

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );

    foreach ($iterator as $item) {
        $item->isDir() && !$item->isLink() ? rmdir($item->getPathname()) : unlink($item->getPathname());
    }

    rmdir($path);
}

foreach ($targets as $target) {
    removeTree($target);
}

$content = $root . '/playground/content';
if (is_dir($content)) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($content, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($iterator as $item) {
        if ($item->isDir() && $item->getFilename() === '_changes') {
            removeTree($item->getPathname());
        } elseif ($item->isFile() && $item->getFilename() === '.lock') {
            unlink($item->getPathname());
        }
    }
}

if ($resetPlugins) {
    $plugins = $root . '/playground/site/plugins';
    removeTree($plugins);
    mkdir($plugins, 0777, true);
    touch($plugins . '/.gitkeep');
}

fwrite(STDOUT, "Playground runtime state reset.\n");

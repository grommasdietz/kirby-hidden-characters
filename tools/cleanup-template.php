#!/usr/bin/env php
<?php

declare(strict_types=1);

// Removes template-only tooling and helper files once the plugin has been customized.
// Run with --apply to actually delete; default is dry-run.

$apply = in_array('--apply', $argv, true);
$root  = realpath(__DIR__ . '/..');

if ($root === false) {
    fwrite(STDERR, "Could not resolve project root.\n");
    exit(1);
}

$targets = [
    ['path' => 'tools/init.php', 'reason' => 'Starter init script used for renaming the plugin'],
    ['path' => 'tools/init-config.json', 'reason' => 'Config consumed by the init script'],
    ['path' => 'tools/switch-license.php', 'reason' => 'License switcher not needed after choosing a license'],
    ['path' => 'licenses', 'reason' => 'License templates used by switch-license'],
    ['path' => 'tools/cleanup-template.php', 'reason' => 'This cleanup script itself'],
];

$notes = [
    'Update docs (README, docs/maintenance/license.md) if they reference init or license switching.',
    'Keep LICENSE.md at the root; this script does not remove it.',
    'Remove the init, switch-license and cleanup-template entries from the task file.',
];

function removePath(string $absPath): void
{
    if (!file_exists($absPath)) {
        return;
    }

    if (is_dir($absPath) && !is_link($absPath)) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($absPath, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $item) {
            $itemPath = $item->getPathname();
            $item->isDir() && !is_link($itemPath) ? rmdir($itemPath) : unlink($itemPath);
        }
        rmdir($absPath);
    } else {
        unlink($absPath);
    }
}

echo $apply ? "Running cleanup (will delete files)...\n" : "Dry run (nothing deleted). Use --apply to delete.\n";

foreach ($targets as $target) {
    $abs = $root . DIRECTORY_SEPARATOR . $target['path'];
    if (!file_exists($abs)) {
        echo "[skip] {$target['path']} (not found)\n";
        continue;
    }

    if ($apply) {
        removePath($abs);
        echo "[removed] {$target['path']} — {$target['reason']}\n";
    } else {
        echo "[would remove] {$target['path']} — {$target['reason']}\n";
    }
}

if (!$apply) {
    echo "\nRe-run with --apply to perform deletion.\n";
}

echo "\nFollow-ups:\n";
foreach ($notes as $note) {
    echo "- {$note}\n";
}

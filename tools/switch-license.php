#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Switches the plugin license between MIT and GD Commercial.
 *
 * Usage:
 *   php tools/switch-license.php --license=mit
 *   php tools/switch-license.php --license=commercial
 */

function switchLicense(string $root, ?string $licenseOption): void
{
    if ($licenseOption === null || trim($licenseOption) === '') {
        return;
    }

    $choice = strtolower(trim($licenseOption));

    $licenseTemplates = [
        'mit' => [
            'file' => $root . '/licenses/MIT.md',
            'composer' => 'MIT',
            'node' => 'MIT',
            'label' => 'MIT',
        ],
        'commercial' => [
            'file' => $root . '/licenses/GD_COMMERCIAL_LICENSE.md',
            'composer' => 'proprietary',
            'node' => 'UNLICENSED',
            'label' => 'GD Commercial License',
        ],
    ];

    if (isset($licenseTemplates[$choice]) === false) {
        fwrite(STDERR, 'Unknown --license option. Use "mit" or "commercial".' . PHP_EOL);
        exit(1);
    }

    $template = $licenseTemplates[$choice];

    if (is_file($template['file']) === false) {
        fwrite(STDERR, 'License template not found: ' . $template['file'] . PHP_EOL);
        exit(1);
    }

    copy($template['file'], $root . '/LICENSE.md');

    updateJsonField($root . '/composer.json', 'license', $template['composer']);
    updateJsonField($root . '/package.json', 'license', $template['node']);
    updateReadmeLicense($root . '/README.md', $template['label']);

    fwrite(STDOUT, "Switched license to {$choice}." . PHP_EOL);
}

function updateJsonField(string $file, string $field, string $value): void
{
    if (is_file($file) === false) {
        return;
    }

    $decoded = json_decode((string) file_get_contents($file), true);
    if (is_array($decoded) === false) {
        return;
    }

    $decoded[$field] = $value;

    file_put_contents(
        $file,
        json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL
    );
}

function updateReadmeLicense(string $file, string $label): void
{
    if (is_file($file) === false) {
        return;
    }

    $contents = (string) file_get_contents($file);
    $replacement = '[' . $label . '](LICENSE.md)';

    $updated = preg_replace(
        '/\[[^\]]+\]\(LICENSE\.md\)/',
        $replacement,
        $contents,
        1,
    );

    if ($updated !== null && $updated !== $contents) {
        file_put_contents($file, $updated);
    }
}

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    $root = dirname(__DIR__);
    $options = getopt('', ['license::', 'help::']);

    if (isset($options['help'])) {
        fwrite(
            STDOUT,
            <<<TXT
Usage: php tools/switch-license.php --license=mit|commercial

TXT
        );
        exit(0);
    }

    $licenseOption = isset($options['license']) ? trim((string) $options['license']) : null;
    switchLicense($root, $licenseOption);
}

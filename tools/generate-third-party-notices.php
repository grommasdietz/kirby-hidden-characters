#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__);

$outFile = $root . '/THIRD_PARTY_NOTICES.md';

$sections = [];

// -----------------------------
// Composer (PHP)
// -----------------------------
$composerLock = $root . '/composer.lock';
if (is_file($composerLock)) {
    $decoded = json_decode((string) file_get_contents($composerLock), true);
    $packages = $decoded['packages'] ?? [];
    usort($packages, static fn ($a, $b) => strcmp($a['name'] ?? '', $b['name'] ?? ''));

    $lines = [];
    foreach ($packages as $package) {
        $name = $package['name'] ?? 'unknown';
        $licenses = $package['license'] ?? [];
        $homepage = $package['homepage'] ?? '';

        $licenseText = is_array($licenses) ? implode(', ', $licenses) : (string) $licenses;
        $line = "- {$name} — {$licenseText}";
        if ($homepage !== '') {
            $line .= " — {$homepage}";
        }
        $lines[] = $line;
    }

    $sections[] = "## PHP dependencies (Composer)\n\n" . implode("\n", $lines);
}

// -----------------------------
// Node (JS)
// -----------------------------
// Use the pinned package manager; never download an unlocked license tool.
$packageJson = json_decode((string) file_get_contents($root . '/package.json'), true, 512, JSON_THROW_ON_ERROR);
$requiredDependencies = $packageJson['dependencies'] ?? [];
$optionalDependencies = $packageJson['optionalDependencies'] ?? [];
$hasNodeProductionDependencies = count($requiredDependencies) > 0 || count($optionalDependencies) > 0;

if ($hasNodeProductionDependencies) {
    $output = [];
    $exit = 0;
    $command = 'pnpm --dir ' . escapeshellarg($root) . ' licenses list --prod --json --long';
    exec($command . ' 2>/dev/null', $output, $exit);
    if ($exit !== 0) {
        throw new RuntimeException('Could not read production dependency licenses. Run pnpm install first.');
    }

    $licenses = json_decode(implode("\n", $output), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($licenses) || (count($requiredDependencies) > 0 && count($licenses) === 0)) {
        throw new RuntimeException('The production dependency license report is empty or invalid.');
    }

    $items = [];
    foreach ($licenses as $license => $packages) {
        if (!is_array($packages)) {
            throw new RuntimeException('The production dependency license report has an invalid package group.');
        }
        foreach ($packages as $package) {
            $name = $package['name'] ?? null;
            if (!is_string($name)) {
                throw new RuntimeException('The production dependency license report has an invalid package.');
            }
            if ($name === ($packageJson['name'] ?? null)) {
                continue;
            }
            $line = "- {$name} — {$license}";
            $homepage = $package['homepage'] ?? '';
            if (is_string($homepage) && $homepage !== '') {
                $line .= " — {$homepage}";
            }
            $items[] = $line;
        }
    }

    sort($items, SORT_STRING);
    if (count($items) > 0) {
        $sections[] = "## JS dependencies (Node)\n\n" . implode("\n", array_unique($items));
    }
}

$hasSections = count($sections) > 0;
$intro = $hasSections
    ? 'Kirby Hidden Characters uses following third-party dependencies:'
    : 'Kirby Hidden Characters does not use any third-party dependencies.';

$header = <<<MD
# Third-party notices

{$intro}

---


MD;

file_put_contents(
    $outFile,
    $header . ($hasSections ? implode("\n\n", $sections) . "\n" : '')
);

fwrite(STDOUT, "Wrote {$outFile}\n");

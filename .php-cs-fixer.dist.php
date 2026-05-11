<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->name('*.php')
    ->exclude([
        'vendor',
        'node_modules',
        '.phpunit.cache',
        '.husky',
        '.github',
        'example',
        'playground/vendor',
        'playground/kirby',
        'playground/site/plugins',
        'playground/site/cache',
        'playground/site/accounts',
        'playground/site/logs',
        'playground/site/sessions',
        'playground/media',
        'playground/site/templates',
        'playground/site/config',
        'playground/content',
    ]);

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
    ])
    ->setFinder($finder);

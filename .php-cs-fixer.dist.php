<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__)
    ->name('*.php')
    ->exclude([
        '.git',
        '.github',
        '.husky',
        '.phpunit.cache',
        'kirby',
        'node_modules',
        'vendor',
    ])
    ->notPath('#^playground/(?:vendor|kirby|content|media)(?:/|$)#')
    ->notPath('#^playground/site/(?:plugins|cache|accounts|logs|sessions|templates|config)(?:/|$)#');

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
    ])
    ->setFinder($finder);

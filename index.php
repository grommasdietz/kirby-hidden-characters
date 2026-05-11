<?php

use Kirby\Cms\App;

$autoload = __DIR__ . '/vendor/autoload.php';

if (is_file($autoload)) {
    require_once $autoload;
}

App::plugin('grommasdietz/hidden-characters', []);

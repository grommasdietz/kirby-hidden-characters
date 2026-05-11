<?php

require __DIR__ . '/vendor/autoload.php';

use Kirby\Cms\App;

require 'kirby/bootstrap.php';

echo (new App())->render();

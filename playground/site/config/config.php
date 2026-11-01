<?php

return [
    ...(require dirname(__DIR__, 3) . '/tools/playground-secrets.php'),
    'debug' => true,
    'panel.vue.compiler' => false,
];

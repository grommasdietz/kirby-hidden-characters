<?php

declare(strict_types=1);

/** @return array{'content.salt': string, 'cookie.key': string} */
return (static function (): array {
    // Keep local secrets outside the playground document root and runtime resets.
    $path = dirname(__DIR__) . '/.env';
    $mask = umask(0077);

    try {
        $handle = fopen($path, 'c+b');
    } finally {
        umask($mask);
    }

    if ($handle === false) {
        throw new RuntimeException('Unable to open the local playground secrets file.');
    }

    try {
        if (!chmod($path, 0600) || !flock($handle, LOCK_EX)) {
            throw new RuntimeException('Unable to protect the local playground secrets file.');
        }

        $contents = stream_get_contents($handle);
        if ($contents === false) {
            throw new RuntimeException('Unable to read the local playground secrets file.');
        }

        $secrets = [];
        $changed = false;
        foreach (['content.salt' => 'KIRBY_CONTENT_SALT', 'cookie.key' => 'KIRBY_COOKIE_KEY'] as $option => $key) {
            $provided = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
            if (is_string($provided) && $provided !== '') {
                if (strlen($provided) < 32) {
                    throw new RuntimeException($key . ' must contain at least 32 characters.');
                }

                $secrets[$option] = $provided;
                continue;
            }

            // Read only the two generated scalar keys; preserve all other .env settings.
            $assignment = '/^[\t ]*(?:export[\t ]+)?' . $key . '[\t ]*=/m';
            $pattern = '/^[\t ]*(?:export[\t ]+)?' . $key . '[\t ]*=[\t ]*'
                . '("([^"\r\n]*)"|\'([^\'\r\n]*)\'|([^\'"#\r\n]*?))[\t ]*(?:#.*)?\r?$/m';
            $count = preg_match_all($assignment, $contents);
            $matched = preg_match($pattern, $contents, $matches, PREG_OFFSET_CAPTURE | PREG_UNMATCHED_AS_NULL);

            if ($count > 1 || ($count === 1 && $matched !== 1)) {
                throw new RuntimeException('Invalid or duplicate ' . $key . ' assignment in the local .env.');
            }

            $value = $matched === 1
                ? ($matches[2][0] ?? $matches[3][0] ?? trim($matches[4][0] ?? ''))
                : '';

            if ($value === '') {
                $value = bin2hex(random_bytes(32));
                $quoted = '"' . $value . '"';

                if ($matched === 1) {
                    $contents = substr_replace($contents, $quoted, $matches[1][1], strlen($matches[1][0]));
                } else {
                    $newline = str_contains($contents, "\r\n") ? "\r\n" : "\n";
                    if ($contents !== '' && !str_ends_with($contents, "\n")) {
                        $contents .= $newline;
                    }
                    $contents .= $key . '=' . $quoted . $newline;
                }

                $changed = true;
            } elseif (strlen($value) < 32) {
                throw new RuntimeException($key . ' must contain at least 32 characters in the local .env.');
            }

            $secrets[$option] = $value;
        }

        if ($changed) {
            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $contents) !== strlen($contents) || !fflush($handle)) {
                throw new RuntimeException('Unable to save the local playground secrets file.');
            }
        }

        return $secrets;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
})();

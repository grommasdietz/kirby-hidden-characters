<?php

declare(strict_types=1);

namespace GrommasDietz\HiddenCharacters\Tests;

use Kirby\Cms\App;
use GrommasDietz\HiddenCharacters\Tests\Support\TestEnvironment;
use PHPUnit\Framework\TestCase as BaseTestCase;

/**
 * Base test case that exposes a helper to boot the Kirby playground.
 */
abstract class TestCase extends BaseTestCase
{
    protected App $kirby;

    /**
     * Boots Kirby for the test suite. Pass overrides to tweak configuration.
     *
     * @param array<string,mixed> $overrides
     */
    protected function bootKirby(array $overrides = []): App
    {
        $this->kirby = TestEnvironment::boot($overrides);

        return $this->kirby;
    }

    protected function tearDown(): void
    {
        if (isset($this->kirby)) {
            $this->kirby->impersonate(null);
        }

        TestEnvironment::restoreHandlers();

        App::destroy();

        parent::tearDown();
    }
}

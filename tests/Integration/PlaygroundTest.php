<?php

declare(strict_types=1);

namespace GrommasDietz\HiddenCharacters\Tests\Integration;

use GrommasDietz\HiddenCharacters\Tests\TestCase;

final class PlaygroundTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->bootKirby()->impersonate('kirby');
    }

    public function testPluginRegistersWithKirby(): void
    {
        $this->assertNotNull($this->kirby->plugin('grommasdietz/hidden-characters'));
    }

    public function testHomePageCanBeLoaded(): void
    {
        $page = $this->kirby->page('home');

        $this->assertSame('home', $page?->id());
        $this->assertSame('Home', $page?->title()->value());
    }

    public function testUsersCanBeCreatedAndDeleted(): void
    {
        // Clean up any leftover test users from a prior run
        // (prepareAccounts is non-destructive to support seeded users)
        foreach (['primary-admin@kirby-hidden-characters.test', 'secondary-admin@kirby-hidden-characters.test'] as $email) {
            $existing = $this->kirby->user($email);
            $existing?->delete();
        }

        // seedUsers() creates a default admin during boot
        $seededCount = $this->kirby->users()->count();
        $this->assertGreaterThanOrEqual(1, $seededCount);

        $primaryAdmin = $this->kirby->users()->create([
            'email' => 'primary-admin@kirby-hidden-characters.test',
            'name' => 'Primary Admin',
            'role' => 'admin',
            'password' => 'test-password',
        ]);

        $secondaryAdmin = $this->kirby->users()->create([
            'email' => 'secondary-admin@kirby-hidden-characters.test',
            'name' => 'Secondary Admin',
            'role' => 'admin',
            'password' => 'test-password',
        ]);

        $this->assertSame('admin', $primaryAdmin->role()->name());
        $this->assertSame('admin', $secondaryAdmin->role()->name());
        $this->assertCount($seededCount + 2, $this->kirby->users());

        $secondaryAdmin->delete();

        $this->assertCount($seededCount + 1, $this->kirby->users());
        $this->assertNotNull(
            $this->kirby->user('primary-admin@kirby-hidden-characters.test')
        );

        // Clean up test-created user so it doesn't persist on disk
        $primaryAdmin->delete();
    }
}

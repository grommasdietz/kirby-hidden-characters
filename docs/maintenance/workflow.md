# Release workflow

Versions are not changed manually during normal development. Conventional Commits on `main` are analyzed by Semantic Release.

For breaking changes, include a `BREAKING CHANGE:` footer in the commit message that reaches `main`. The default Angular parser does not recognize `!` in a header such as `feat!:` on its own:

```text
feat(panel): support the next Kirby major

BREAKING CHANGE: This release requires the new Kirby Panel runtime.
```

When merging with squash, preserve that footer in the squash commit. Verify the release toolchain with `node --test tools/release-toolchain.test.mjs` before publishing changes to release configuration or breaking-change handling.

The release transaction:

1. calculates the next semantic version;
2. writes it to `composer.json` and `package.json`;
3. refreshes `composer.lock` metadata;
4. runs `composer release:check`;
5. updates `CHANGELOG.md`;
6. commits the synchronized release files and creates the GitHub tag/release.

Before pushing a release-triggering commit, run:

```bash
composer install -d playground
composer install
pnpm install --frozen-lockfile
composer verify
composer release:check
pnpm verify
```

The manual installation download is GitHub's automatic archive for the immutable release tag. `.gitattributes` filters development files from that archive; no custom ZIP artifact is built or uploaded.

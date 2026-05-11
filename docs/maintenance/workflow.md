# Workflow

This repository uses **semantic-release** on the `main` branch. Releases, tags, and the changelog are generated from Conventional Commits.

> [!IMPORTANT]
> Don't bump versions by hand. Merge Conventional Commits to `main` and let CI publish the release.

---

## Pre-flight checklist

- [ ] Panel assets built and committed via `pnpm build`
- [ ] All checks pass on `composer run verify` and `pnpm run verify`
- [ ] No local runtime data or playground content is committed
- [ ] Third‑party notices are regenerated via `composer run notices:generate` if required

---

Next: Return to [Documentation](../index.md)

# Documentation

Use this checklist to keep docs consistent with the style guide.

> [!IMPORTANT]
> Follow the global [Style guide](/STYLE_GUIDE.md) for structure, tone, and typography.

---

## Principles

- [ ] Prefer short, task-oriented docs
- [ ] One main topic per file
- [ ] Put user-facing how-to in [README.md](/README.md)
- [ ] Keep deeper details in [docs](/docs)

---

## Structure

- [ ] Each [docs](/docs) filename is written in lower case (e.g. [tests.md](/docs/contributions/tests.md))
- [ ] Each [index.md](/docs/index.md) is the table of contents per folder level
  - [ ] It assumes the reader has already read [README.md](/README.md) and parent index files
  - [ ] It starts with a brief introduction that sets expectations
- [ ] Create subfolders in [docs](/docs) if a topic needs deeper coverage (e.g. CLI commands)
- [ ] Each subfolder should start with an [index.md](index.md) file
  - [ ] Each file ends with a next link (`Next: ...`) that points to the next child or sibling
  - [ ] Example: `Next: Continue with [Tests](./tests.md)`
- [ ] Run `pnpm run docs:verify` to lint docs and validate local links, navigation and documented commands

---

Next: Continue with [Maintenance](../maintenance/index.md)

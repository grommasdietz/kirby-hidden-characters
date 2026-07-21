# Plugin structure

This page separates runtime files from development tooling.

---

## Runtime essentials

These files are required at runtime and must stay in release archives:

- `index.php` — Plugin entry point that registers the compiled Panel assets
- `index.js` / `index.css` — Compiled Panel assets (keep committed)
- `assets/fonts/hidden-characters.woff2` — Bundled runtime font

---

## Development‑only

The following live in the repository but are excluded from release archives:

- `src` — Panel source for kirbyup
- `playground` — Local Kirby site for integration and browser tests
- `tests` — PHPUnit and Playwright suites
- `tools` — Local helper scripts
- `docs`, `CONTRIBUTING.md`, `STYLE_GUIDE.md`, `SECURITY.md` — Documentation and policies
- Tooling config (ESLint, PostCSS, Psalm, PHPUnit, Playwright)

Packaging rules for release archives live in `.gitattributes`.

---

## Psalm configuration

Psalm currently analyzes `index.php`, which is the plugin’s only PHP runtime file. If PHP source directories are added later, include them under `<projectFiles>` in `psalm.xml.dist`. Add directory-specific suppressions only when a concrete Kirby framework pattern requires them; YAML and static asset directories do not need Psalm configuration.

---

Next: Continue with [Workflow](./workflow.md)

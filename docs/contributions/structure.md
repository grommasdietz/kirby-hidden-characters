# Plugin structure

This page separates runtime files from development tooling.

---

## Runtime essentials

These files are required at runtime and must stay in release archives:

- `index.php` — Plugin entry point
- `index.js` / `index.css` — Compiled Panel assets (keep committed)
- `lib` — PHP source (`GrommasDietz\\HiddenCharacters\\`)

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

Psalm errors if directories referenced in `issueHandlers` do not exist. When you add plugin folders, update `psalm.xml.dist` accordingly:

| Folder added        | Psalm update                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `snippets`          | Add `<directory name="snippets" />` under `<UndefinedMagicMethod>` |
| `models`            | Add to `<projectFiles>` if outside `lib`                           |
| `blueprints`        | No change needed (YAML only)                                       |
| `assets`            | No change needed (static files)                                    |
| `translations`      | No change needed (PHP arrays, covered globally)                    |
| `config` / `routes` | Add `<directory name="..." />` under `<InvalidScope>`              |

Example (adding `snippets`):

```xml
<UndefinedMagicMethod>
    <errorLevel type="suppress">
        <directory name="playground/site/templates" />
        <directory name="snippets" />
    </errorLevel>
</UndefinedMagicMethod>
```

Only add directories that actually exist.

---

## Environment and secrets

Keep secrets in `playground/.env`. If `vlucas/phpdotenv` is installed, tests will load it automatically.

---

Next: Continue with [Workflow](./workflow.md)

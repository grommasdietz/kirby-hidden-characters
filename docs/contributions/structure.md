# Plugin structure

Runtime entry points:

- `index.php`: registers the plugin (Composer autoload expected for PHP classes).
- `index.js` / `index.css`: compiled Panel assets that must be committed for releases.

Authoring sources:

- `src/index.js`, `src/components/**`: Panel code built with `kirbyup`.
- `lib/` (PHP): add classes under the `GrommasDietz\\HiddenCharacters\\` namespace.

Optional plugin folders. Add them only when they contain shipped files. Skip empty placeholders:

- `assets/`: Panel-facing static assets (fonts, extra JS/CSS) that are not bundled via `kirbyup`.
- `blueprints/`: Panel blueprints for fields, blocks, and sections.
- `snippets/` / `templates/`: frontend rendering helpers.
- `models/` / `methods/`: PHP models and global helpers.
- `translations/`: localized strings for the Panel and site.
- `config/` / `routes/`: plugin defaults and route definitions.
- `resources/`: shared files (e.g. images) that should ship with the plugin.

Remove template-only helpers with `php tools/cleanup-template.php --apply` once
they are no longer useful for local maintenance.

Playground:

- `playground/`: self-contained Kirby site for integration/browser tests.
- `playground/site/blueprints/site.yml`: includes the demo section so the Panel shows something on first boot (remove or replace as needed).

When you add blocks, marks, fields, routes, config folders, or other Kirby pieces:

- Run `pnpm build` (or `pnpm run verify` if you also want linting/tests) so compiled assets stay in sync.
- Add focused fixtures to `playground/site/**` if tests need them.
- Update `psalm.xml.dist` when you add new plugin folders (see below).
- Extend PHPUnit/Playwright coverage for new behavior.

---

## Psalm configuration

Psalm errors if directories referenced in `issueHandlers` don't exist. The configuration ships with global suppressions for common Kirby patterns, plus directory-specific rules only for folders that always exist (`config`, `templates`).

When you add plugin folders, update `psalm.xml.dist`:

| Folder added          | Psalm update                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `snippets/`           | Add `<directory name="snippets" />` under `<UndefinedMagicMethod>` |
| `models/`             | Add to `<projectFiles>` if outside `lib/`                          |
| `blueprints/`         | No change needed (YAML only)                                       |
| `assets/`             | No change needed (static files)                                    |
| `translations/`       | No change needed (PHP arrays, covered globally)                    |
| `config/` / `routes/` | Add `<directory name="..." />` under `<InvalidScope>`              |

Example: adding a `snippets/` folder:

```xml
<UndefinedMagicMethod>
    <errorLevel type="suppress">
        <directory name="playground/site/templates" />
        <directory name="snippets" />
    </errorLevel>
</UndefinedMagicMethod>
```

Only add directories that actually exist to avoid Psalm errors.

---

## Integrations and secrets

- Keep secrets in `playground/.env` and let `vlucas/phpdotenv` load them during tests.

---

Next: Continue with [Workflow](./workflow.md)

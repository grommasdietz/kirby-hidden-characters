# Workflow

This page covers the core developer workflow for Panel assets and tooling.

---

## Panel assets

Panel source lives in `src/index.js` and `src/components`.

Build production assets:

```bash
pnpm build
```

> [!NOTE]
> `pnpm build` runs kirbyup and writes `index.js` and `index.css` at the repo root. Keep both committed.

Run the dev server while iterating:

```bash
pnpm dev
```

PostCSS is configured in `postcss.config.cjs` (autoprefixer by default).

---

## kirbyuse

`kirbyuse` is installed for Panel helper composables and type-friendly access to `window.panel`.

Import composables where needed:

```js
import { usePanel } from "kirbyuse";

export default {
  mounted() {
    const panel = usePanel();
    panel.notification.success("kirbyuse is ready.");
  },
};
```

---

## Dependency updates

Update PHP dependencies (repo and playground):

```bash
composer update
composer update -d playground
```

Update JS dev dependencies:

```bash
pnpm run update:dev
```

---

Next: Continue with [Tests](./tests.md)

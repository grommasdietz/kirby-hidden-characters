# Usage

Kirby Hidden Characters automatically activates on focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. No blueprint or configuration changes are needed.

Markers are visual only: stored content, text selection and copy/paste remain unchanged. See [architecture](architecture.md) for rendering and extension details.

## Writer marker opacity

Writer markers use their source element's text color: whitespace follows its surrounding mark, line breaks follow their parent element, and paragraph/story endings follow their paragraph. CSS dims the markers to 40% opacity, so dark code text on a light background keeps dark markers even in dark mode. Links and custom marks keep their own marker colors.

Override the opacity globally or on an individual Writer wrapper in your Panel CSS:

```css
.k-writer-input {
  --gd-hc-writer-marker-opacity: 0.5;
}
```

Use a value from `0` to `1`. Textarea markers retain their light/dark colors at 40% opacity. Single-line fields retain their existing focus palettes.

---

## Supported fields

| Field type | Markers |
| :--- | :--- |
| `writer` | Whitespace, soft hyphens, tabs, line breaks and paragraph/story endings |
| `textarea` | Whitespace, soft hyphens, tabs, line breaks and endings |
| `text` | Supported space characters in a single-line input |

> Soft hyphens, tabs, line breaks, and paragraph endings are only rendered in `writer` and `textarea`, not in single-line `<input>` elements.

---

Next: Continue with [Architecture](./architecture.md)

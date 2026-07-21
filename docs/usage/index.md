# Usage

Kirby Hidden Characters automatically activates on focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. No blueprint or configuration changes are needed.

The plugin applies its custom whitespace font directly to the real input. On focus, spaces and no-break spaces become visible without changing the field's typography or line wrapping. Structural characters use a non-interactive helper layer: writer markers are positioned from the real ProseMirror layout, while textareas retain a grid-aligned mirror because native textarea text does not expose DOM ranges.

Single-line `text` fields use only the font mechanism because a horizontally scrolling helper layer cannot be synchronized reliably.

---

## Supported fields

| Field type | How it works                                                                                              |
| :--------- | :-------------------------------------------------------------------------------------------------------- |
| `writer`   | Real ProseMirror text plus a marker-only layer positioned from DOM `Range` rectangles                     |
| `textarea` | Real textarea text plus a grid-aligned mirror updated through the native `input` event                    |
| `text`     | Custom whitespace font applied directly and revealed on focus                                             |

> Soft hyphens, tabs, line breaks, and paragraph endings are only rendered in `writer` and `textarea`, not in single-line `<input>` elements.

---

Next: Continue with [Architecture](./architecture.md)

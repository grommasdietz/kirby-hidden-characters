# Usage

Kirby Hidden Characters automatically activates on focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. No blueprint or configuration changes are needed.

Writer fields keep Kirby's native typography for all real text. On focus, a non-interactive helper layer positions every marker from the real ProseMirror layout, so links, code and custom marks retain their own colors and fonts. Textareas and text fields continue to use the custom whitespace font because native inputs do not expose DOM ranges.

Single-line `text` fields use only the font mechanism because a horizontally scrolling helper layer cannot be synchronized reliably.

---

## Supported fields

| Field type | How it works                                                                                              |
| :--------- | :-------------------------------------------------------------------------------------------------------- |
| `writer`   | Native ProseMirror text plus a marker-only layer positioned from DOM `Range` rectangles                   |
| `textarea` | Real textarea text plus a grid-aligned mirror updated through the native `input` event                    |
| `text`     | Custom whitespace font applied directly and revealed on focus                                             |

> Soft hyphens, tabs, line breaks, and paragraph endings are only rendered in `writer` and `textarea`, not in single-line `<input>` elements.

---

Next: Continue with [Architecture](./architecture.md)

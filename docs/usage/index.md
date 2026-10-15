# Usage

Kirby Hidden Characters automatically activates on focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. No blueprint or configuration changes are needed.

Writer fields keep Kirby's native typography for all real text. On focus, a non-interactive helper layer positions every marker from the real ProseMirror layout, so links, code and custom marks retain their own colors and fonts. Textareas use a color-free whitespace font with identical spacing metrics and draw all markers in their mirror. This avoids Safari painting wrapped text black in dark mode. Single-line text fields retain the custom color font.

Single-line `text` fields use only the font mechanism because a horizontally scrolling helper layer cannot be synchronized reliably.

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

| Field type | How it works                                                                                              |
| :--------- | :-------------------------------------------------------------------------------------------------------- |
| `writer`   | Native ProseMirror text plus a marker-only layer positioned from DOM `Range` rectangles                   |
| `textarea` | Real textarea text plus a grid-aligned mirror updated through the native `input` event                    |
| `text`     | Custom whitespace font applied directly and revealed on focus                                             |

> Soft hyphens, tabs, line breaks, and paragraph endings are only rendered in `writer` and `textarea`, not in single-line `<input>` elements.

---

Next: Continue with [Architecture](./architecture.md)

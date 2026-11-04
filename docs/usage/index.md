# Usage

Kirby Hidden Characters automatically activates on focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. No blueprint or configuration changes are needed.

Markers are visual only: stored content, text selection and copy/paste remain unchanged. See [architecture](architecture.md) for rendering and extension details.

## Marker styling

Writer markers follow their surrounding text color, including links, code and
custom marks. Textarea markers are black in the light theme and white in the
dark theme. Both use 40% opacity by default.

Set a shared opacity in your Panel CSS, globally or on a field wrapper:

```css
.k-panel {
  --gd-hc-marker-opacity: 0.5;
}
```

Use a value from `0` to `1`. To choose one color for Writer and textarea markers,
set `--gd-hc-marker-color` on the same wrapper:

```css
.k-field-name-text {
  --gd-hc-marker-color: #087ac1;
  --gd-hc-marker-opacity: 0.6;
}
```

These properties affect only markers. Native text colors, focus visibility,
selection and content remain unchanged. Without a color override, Writer keeps
each source element's color.

### Single-line text fields

Single-line fields render spaces through a color font rather than a marker
layer. CSS font palettes require explicit colors, so the two properties above
do not control these fields. Override the focused palette in your Panel CSS;
include the desired opacity in the color:

```css
@font-palette-values --project-hidden-characters {
  font-family: "hidden-characters";
  override-colors: 0 rgb(8 122 193 / 60%);
}

.k-string-input.k-text-input:focus-within {
  font-palette: --project-hidden-characters;
}
```

Only the marker palette entry is replaced. The transparent blur palette and
normal input text remain unchanged. Define separate palettes and selectors if
you want different colors per theme or field. Keeping the native input avoids
a scrolling mirror and its additional synchronization logic.

### Writer marker opacity

Existing `--gd-hc-writer-marker-opacity` overrides remain supported when
`--gd-hc-marker-opacity` is unset. Use the shared property for new styles.

---

See the [character legend](characters.md) for glyphs and Unicode values.

## Supported fields

| Field type | Markers |
| :--- | :--- |
| `writer` | Whitespace, soft hyphens, tabs, line breaks and paragraph/story endings |
| `textarea` | Whitespace, soft hyphens, tabs and line breaks |
| `text` | Supported space characters in a single-line input |

> Single-line `<input>` elements show supported space characters only. Paragraph and story endings are Writer-only markers.

---

Next: Continue with [Architecture](./architecture.md)

# Usage

Kirby Hidden Characters automatically activates on focused [writer](https://getkirby.com/docs/reference/panel/fields/writer), [textarea](https://getkirby.com/docs/reference/panel/fields/textarea), and [text](https://getkirby.com/docs/reference/panel/fields/text) fields. No blueprint or configuration changes are needed.

When a field receives focus, a read-only overlay renders above the input and shows each hidden character using a custom icon font and CSS pseudo-elements. Losing focus hides the overlay.

Single-line `text` fields use only the font mechanism — a scrollable overlay clone is unreliable for horizontally-scrolling inputs.

---

## Supported fields

| Field type | How it works                                                             |
| :--------- | :----------------------------------------------------------------------- |
| `writer`   | Overlay mirrors the ProseMirror DOM; updated via `MutationObserver`      |
| `textarea` | Overlay mirrors the textarea value; updated via the native `input` event |
| `text`     | Custom icon font applied directly; revealed on focus via CSS[^text-only] |

[^text-only]: Tab, Line Break, and Soft Hyphen are not visible in `text` fields. Single-line `<input>` elements don't support line breaks, collapse tabs to spaces, and never create hyphenation opportunities for soft hyphens.

---

Next: Continue with [Architecture](./architecture.md)

# Architecture

Kirby Hidden Characters consists of a JavaScript entry point (`src/index.js`) and a CSS file (`src/styles/hidden-characters.css`). The plugin's `index.php` only registers the compiled Panel assets; there is no PHP runtime component.

---

## Rendering strategy

Hidden characters are visualized through three complementary mechanisms:

1. **Custom color font on the real fields** — A WOFF2 font is applied continuously to supported fields. Its `unicode-range` covers space codepoints (`U+0020`, `U+00A0`, `U+2000–200A`, `U+202F`, `U+205F`) and the private-use glyphs used for structural markers. `font-palette` keeps spaces transparent by default and reveals them on focus. Because the font never changes on focus, whitespace advance widths remain stable.

2. **Marker-only writer layer** — ProseMirror text is laid out only by Kirby's real `.ProseMirror` element. A sibling `div.gd-hidden-characters--writer-markers` contains absolutely positioned marker spans only; it never clones paragraph text. Marker coordinates are derived from DOM `Range` rectangles in the real editor for paragraph ends, hard breaks, soft hyphens and tabs. Consequently an NBSP cannot wrap differently in a second formatting context.

3. **Grid-aligned textarea mirror** — Native textareas do not expose text-node ranges. They retain a transparent mirror in the same CSS grid cell, with the toolbar in the row above it. Newline, tab and soft-hyphen helpers are rendered only in this textarea mirror.

Single-line `text` fields use only the font mechanism because horizontally scrolling input values cannot be mirrored reliably.

---

## Vue mixin

`hiddenCharactersMixin` is registered as a global Vue mixin via `Vue.mixin()`. Its `mounted()` hook compares `this.$options.name` against the list of target components. Non-matching components exit immediately.

Default target components:

- `k-writer-input`
- `k-textarea-input`

---

## Writer branch

For `k-writer-input`, the mixin locates the real `.ProseMirror` element and:

1. Inserts an empty marker layer directly after it.
2. Reads marker positions from the real DOM rather than serializing and re-parsing `innerHTML`.
3. Uses a `MutationObserver`, `ResizeObserver`, focus/scroll/input listeners, window resize and font-loading events to schedule marker-coordinate refreshes.
4. Skips geometry work while the writer is blurred and performs a complete refresh when focus returns.
5. Keeps the layer pointer-events-free and hidden from accessibility APIs.

The marker layer contains only spans such as:

```html
<span
  class="gd-hidden-character-marker"
  data-character="shy"
  style="left: …; top: …; width: …; height: …"
></span>
```

No custom helper element is inserted into ProseMirror's editable DOM, and no generated paragraph marker participates in ProseMirror line breaking.

### Update lifecycle and performance

The writer branch deliberately has no persistent coordinate matrix. ProseMirror and the browser remain the source of truth for layout. A writer refresh:

1. Collects paragraphs and hard-break elements.
2. Walks text nodes to find actual soft hyphens and tabs.
3. Reads `Range` rectangles only for paragraph ends and characters that need structural markers.
4. Replaces the marker spans in one batch.

Text mutations, input events, resizes and font events can all request a refresh. Requests within the same rendering frame are coalesced through one `requestAnimationFrame`. While the writer is blurred, refreshes are skipped because CSS hides the marker layer; focusing the writer triggers a full refresh.

A focused edit currently performs a complete scan rather than incrementally mapping cached positions. Its time complexity is linear in the writer's text and block count, plus the number of markers. This keeps the implementation independent from Kirby's internal ProseMirror instance and avoids stale coordinates after wrapping, font, width or block-height changes. It is appropriate for ordinary Panel fields, but exceptionally large long-form documents can make the geometry pass noticeable. Kirby's internal writer supports extension objects that can return ProseMirror plugins, but the public Panel plugin API currently exposes writer marks and nodes rather than a generic global writer-extension registry. A transaction-aware decoration implementation would therefore require a custom or replaced writer component, or a future public Kirby hook. This plugin intentionally avoids that integration dependency.

Ordinary spaces and NBSPs are not part of this geometry pass. The custom font renders them directly in the real field, so they update immediately and cannot diverge through a second text layout.

---

## Textarea branch

For `k-textarea-input`, the mixin locates `.k-textarea-input-native` and:

1. Creates a transparent mirror that copies the textarea's computed typography and spacing properties.
2. Inserts it after the native element inside `.k-textarea-input-wrapper`.
3. Uses a CSS grid so a toolbar remains in the first row while the textarea and mirror share the second row.
4. Re-renders the mirror on native `input` events and synchronizes scroll offsets.

`renderTextareaContent(value)` keeps newlines and tabs in the mirrored text while adding marker helpers. All ordinary spaces and NBSP glyphs remain owned by the real textarea.

---

## Extension API

Third-party plugins can extend the behavior through `window.gdHiddenCharacters.registerExtension()`:

```js
window.gdHiddenCharacters ??= {};
window.gdHiddenCharacters.registerExtension({
  components: ["k-my-block-writer"],
  cloneTransform(overlayEl, inputEl) {
    if (inputEl.closest(".k-my-block-writer")) {
      overlayEl.classList.add("my-block-overlay");
    }
  },
});
```

### Options

| Option           | Type                                                     | Description                                                                                                   |
| :--------------- | :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `components`     | `string[]`                                               | Additional writer-like Vue component names that contain a `.ProseMirror` descendant.                          |
| `cloneTransform` | `(overlayEl: HTMLElement, inputEl: HTMLElement) => void` | Called before each helper layer is inserted. Inspect `overlayEl.dataset.tag` or `inputEl` to scope changes.   |

The historical `cloneTransform` name and callback timing are retained for API compatibility. The callback is global and is intended for attributes, classes, and styles; writer layers no longer expose cloned paragraph content.

> [!IMPORTANT]
> `registerExtension` must run before the relevant component's `mounted` hook.

---

Next: Continue with [Contributions](../contributions/index.md)

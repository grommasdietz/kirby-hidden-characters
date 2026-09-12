# Architecture

Kirby Hidden Characters consists of a JavaScript entry point (`src/index.js`) and a CSS file (`src/styles/hidden-characters.css`). The plugin's `index.php` only registers the compiled Panel assets; there is no PHP runtime component.

---

## Rendering strategy

Hidden characters are visualized through three complementary mechanisms:

1. **Marker-only writer layer** — ProseMirror text is laid out entirely by Kirby's real `.ProseMirror` element. A sibling `div.gd-hidden-characters--writer-markers` contains absolutely positioned marker spans only; it never clones paragraph text or inserts helpers into the editable DOM. Marker coordinates are derived from DOM `Range` rectangles for every supported whitespace character, paragraph end and hard break. Links, code and custom marks therefore keep their computed colors, fonts and other text styling without participating in a mixed color-font run.

2. **Custom color font on native fields** — A WOFF2 font is applied continuously to textareas and single-line text fields. Its `unicode-range` covers space codepoints (`U+0020`, `U+00A0`, `U+2000–200B`, `U+202F`, `U+205F`) and the private-use glyphs used for structural markers. Palette index `0` contains the neutral marker; `font-palette` keeps it transparent by default and reveals it on focus. Each color glyph also has an off-advance guard layer that uses OpenType palette index `0xFFFF`, so it resolves to the field's computed foreground color. Because the font never changes on focus, whitespace advance widths remain stable.

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
3. Uses a `MutationObserver`, `ResizeObserver`, focus/input/scroll/pointer/transition listeners, window resize and font-loading events to schedule marker-coordinate refreshes.
4. Skips geometry work while the writer is blurred and performs a complete refresh when focus returns.
5. Keeps the layer pointer-events-free and hidden from accessibility APIs.

Focus detection accepts both the active DOM element and ProseMirror's own `ProseMirror-focused` class. This keeps the helper lifecycle aligned with the editor even in browser automation or embedding contexts where the `:focus` pseudo-class is not exposed consistently.

The marker layer contains only spans such as:

```html
<span
  class="gd-hidden-character-marker"
  data-character="no-break-space"
  data-glyph=" "
  style="left: …; top: …; width: …; height: …"
></span>
```

No custom helper element is inserted into ProseMirror's editable DOM, and no generated paragraph marker participates in ProseMirror line breaking.

### Range fragments and Safari

A single character can produce several range rectangles in WebKit. At an NBSP or text-run boundary, an empty caret rectangle can precede the rectangle that contains the actual whitespace advance. Choosing the first rectangle moves the marker onto the preceding letter; a bounding union can also include a fragment on another line.

The renderer therefore prefers rectangles with a positive width. It uses zero-width rectangles only when no advance rectangle exists, preserving soft hyphens, zero-width spaces and collapsed caret positions. This rule follows the returned geometry without detecting browser names or adding mark-specific offsets.

### Alternatives and browser scope

The current split remains intentional after reviewing the earlier implementations:

| Approach | Decision |
| :--- | :--- |
| Full Writer clone with inline helpers | Retired: cloned text and inserted helpers can wrap differently, especially at NBSPs and paragraph endings |
| Color font on real Writer text | Retired: participates in Safari's mixed font runs and previously leaked NBSP palette colors into following link text |
| Literal palettes for each mark and state | Retired: cannot follow arbitrary custom marks, runtime color variables and hover states |
| ProseMirror decorations | Reconsider if Kirby exposes a public global extension hook; currently requires deeper Writer integration |
| Canvas or SVG marker layer | Still needs the same range geometry; adds rendering machinery without fixing the source of this alignment bug |

The marker layer uses established DOM Range, observer and positioning APIs. It does not rely on a new text-layout API or promise compatibility with browsers outside [Kirby's Panel requirements](https://getkirby.com/docs/reference/system/requirements#browsers-for-the-panel). Current cross-engine tests do not prove every older supported browser version.

Native fields remain the compromise: their characters cannot be addressed with DOM ranges, so the font owns whitespace widths and palettes. The textarea grid uses an explicit wrapper attribute rather than `:has()`, which would otherwise require [Firefox 121](https://www.mozilla.org/en-US/firefox/121.0/releasenotes/) despite Kirby's Firefox 110 minimum. Palette overrides remain literal because [CSS Fonts requires absolute override colors](https://drafts.csswg.org/css-fonts-4/#descdef-font-palette-values-override-colors). Future replacement of the native-field font should be evaluated separately against scrolling, wrapping and text-color behavior.

### Update lifecycle and performance

The writer branch deliberately has no persistent coordinate matrix. ProseMirror and the browser remain the source of truth for layout. A writer refresh:

1. Collects paragraphs and hard-break elements.
2. Walks text nodes to find all supported spaces, soft hyphens and tabs.
3. Reads a `Range` rectangle for each marker and caches typography per source element.
4. Builds the marker spans in a detached document fragment and replaces the layer in one batch.

Text mutations, input events, resizes and font events can all request a refresh. Requests within the same rendering frame are coalesced through one `requestAnimationFrame`. While the writer is blurred, refreshes are skipped because CSS hides the marker layer; focusing the writer triggers a full refresh.

A focused edit currently performs a complete scan rather than incrementally mapping cached positions. Its time complexity is linear in the writer's text and block count, plus the number of whitespace markers. DOM writes are batched, but exceptionally large long-form documents with many spaces can still make the geometry pass noticeable. The implementation remains independent from Kirby's internal ProseMirror instance and cannot leave stale document positions after edits, wrapping or font changes. Pointer and transition events cover common hover-driven typography changes.

Kirby's internal Writer supports extension objects that can return ProseMirror plugins, but the public Panel plugin API currently exposes writer marks and nodes rather than a generic global writer-extension registry. A transaction-aware decoration implementation would therefore require a custom or replaced Writer component, or a future public Kirby hook. This plugin intentionally avoids that integration dependency.

Because the helper layer contains markers only, an NBSP cannot wrap differently in a second formatting context. The actual character remains untouched inside ProseMirror and continues to control line breaking, cursor movement, selection, copy/paste and serialization.

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

# Architecture

Kirby Hidden Characters consists of a JavaScript entry point (`src/index.js`) and a CSS file (`src/styles/hidden-characters.css`). The plugin's `index.php` only registers the compiled Panel assets; there is no PHP runtime component.

---

## Rendering strategy

Hidden characters are visualized through two complementary mechanisms:

1. **Custom icon font** — A WOFF2 font is applied unconditionally to all supported field elements. Its `unicode-range` covers space codepoints (`U+0020`, `U+00A0`, `U+2000–200A`, `U+202F`, `U+205F`) and private-use area (PUA) glyphs used by the overlay. `font-palette` keeps glyphs transparent by default and reveals them at 25% opacity on focus. Browsers without `font-palette` support see the glyphs at their baked-in color as progressive enhancement.

2. **Overlay clone** — An absolutely-positioned `div.gd-hidden-characters` is injected next to the real input. It mirrors the field's content with inline custom elements (`<break>`, `<shy>`, `<tab>`) replacing line breaks, soft hyphens, and tabs respectively. CSS `::before` pseudo-elements on those custom elements render PUA glyphs from the icon font. The overlay fades in via `:focus-visible + .gd-hidden-characters` and is otherwise transparent and pointer-events-free.

Single-line `text` fields use only the font mechanism; a scrollable overlay clone is unreliable for horizontally-scrolling inputs.

---

## Vue mixin

`hiddenCharactersMixin` is registered as a global Vue mixin via `Vue.mixin()`. Its `mounted()` hook compares `this.$options.name` against the list of target components. Non-matching components exit immediately with no overhead.

Default target components:

- `k-writer-input`
- `k-textarea-input`

---

## Writer branch

For `k-writer-input`, the mixin locates the `.ProseMirror` element and:

1. Creates an overlay `div` that copies attributes from `.ProseMirror`, excluding a fixed set of non-visual attributes such as `contenteditable`, `id`, `aria-hidden`, and `spellcheck`.
2. Inserts it immediately after the ProseMirror element so `:focus-visible + .gd-hidden-characters` activates on focus.
3. Starts a `MutationObserver` on the ProseMirror element (`childList`, `subtree`, `characterData`) to detect DOM changes. The overlay HTML is regenerated on each mutation.

`renderHiddenCharacters(innerHTML)` parses the ProseMirror HTML and:

- Replaces `<br>` elements with `<break>` elements, skipping ProseMirror's trailing-break `<br>` (a cursor placeholder, not actual content)
- Wraps soft hyphens (`U+00AD`) in `<shy>` elements
- Wraps tab characters (`U+0009`) in `<tab>` elements

---

## Textarea branch

For `k-textarea-input`, the mixin locates `.k-textarea-input-native` and:

1. Creates an overlay `div` that copies computed typography and spacing styles (`font-family`, `font-size`, `line-height`, `padding-*`, `border-*-width`, `tab-size`, and others) so overlay text reflows identically to the textarea.
2. Inserts it after the native element inside `.k-textarea-input-wrapper`. When a toolbar is present, the wrapper is converted to a CSS grid so the overlay occupies the same row as the textarea without covering the toolbar.
3. Listens to the native `input` event and re-renders the overlay from `inputEl.value` on each keystroke.

`renderTextareaContent(value)` processes the raw text value and:

- Converts `\n` to `<break></break>\n` (keeping the newline for `pre-wrap` layout)
- Converts `\t` to `<tab>\t</tab>` (keeping the tab for tab-stop rendering)
- Wraps soft hyphens in `<shy>\u00AD</shy>`
- HTML-escapes all other characters

---

## Extension API

Third-party plugins can extend the overlay behavior by calling `window.gdHiddenCharacters.registerExtension()`. The namespace is exposed on `window` by this plugin's script; use `??=` to guard against load order:

```js
window.gdHiddenCharacters ??= {};
window.gdHiddenCharacters.registerExtension({
  components: ["k-my-block-writer"],
  cloneTransform(overlayEl, inputEl) {
    // mutate overlayEl before it is inserted into the DOM
  },
});
```

### Options

| Option           | Type                                                     | Description                                                                                                                                      |
| :--------------- | :------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `components`     | `string[]`                                               | Additional Vue component names to target. Appended to the default list of `k-writer-input` and `k-textarea-input`.                               |
| `cloneTransform` | `(overlayEl: HTMLElement, inputEl: HTMLElement) => void` | Called after the overlay element is created but before it is inserted into the DOM. Use it to set attributes, modify styles, or add class names. |

### Example: targeting a custom block component

A Kirby blocks plugin that includes a writer in its preview component can opt into hidden-characters rendering:

```js
window.panel.plugin("yourvendor/your-plugin", {
  // ...
});

// Register after your own plugin is set up
window.gdHiddenCharacters ??= {};
window.gdHiddenCharacters.registerExtension({
  components: ["k-my-block-writer"],
  cloneTransform(overlayEl, inputEl) {
    // Scope custom overlay styles to this component
    overlayEl.classList.add("my-block-overlay");
  },
});
```

> [!NOTE]
> The `??=` guard lets your plugin register extensions regardless of whether Kirby Hidden Characters loads before or after your plugin.

> [!IMPORTANT] > `registerExtension` must be called before the relevant component's `mounted` lifecycle hook runs — typically at the top level of your Panel plugin script.

---

Next: Continue with [Contributions](../contributions/index.md)

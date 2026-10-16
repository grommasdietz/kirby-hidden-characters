# Architecture

The PHP entry registers the compiled Panel assets. Rendering and the extension API live in the JavaScript bundle; no PHP content transformation is performed.

## Rendering

- Writer text stays in Kirby's real ProseMirror element. A non-interactive sibling layer positions markers from DOM `Range` rectangles, preserving text layout, marks, selection and serialized content.
- Textareas use a grid-aligned mirror for markers and a color-free whitespace font with the same advance widths as the source font.
- Single-line text fields use the source color font directly; a horizontally scrolling mirror cannot be synchronized reliably.

The global Vue mixin targets `k-writer-input` and `k-textarea-input`. Fonts and marker layers are hidden from accessibility APIs and do not change content.

## Updates and geometry

Mutation, input, focus, resize, scroll, font and relevant style changes schedule a refresh. Requests in the same frame are coalesced. Blurred Writers skip geometry work; focusing them triggers a complete refresh. Observers and listeners are disconnected on destruction.

Writer refreshes scan the current text and blocks and batch marker insertion. Large documents can make this linear geometry pass noticeable. No persistent coordinate cache is maintained across edits or wrapping changes.

For whitespace spanning several range rectangles, the renderer prefers a positive-width rectangle and uses zero-width caret geometry only when necessary. Trailing hard breaks use ProseMirror's trailing placeholder to place the paragraph-end marker on the empty final line.

## Fonts and colors

Writer markers inherit their source element's text color through a foreground-only font. Opacity is controlled by `--gd-hc-writer-marker-opacity`; see [usage](index.md#writer-marker-opacity).

The textarea metrics font removes the source font's color tables while retaining advance widths and variations. Its mirror exposes marker pseudo-elements while keeping mirror text hidden. Single-line inputs retain the source color font and focus palettes.

Font sources and regeneration commands are documented in [setup](../contributions/setup.md#font-tooling).

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

`cloneTransform` is called before insertion and can set helper-layer attributes, classes and styles. The Writer layer contains markers only, not cloned paragraph content.

> [!IMPORTANT]
> `registerExtension` must run before the relevant component's `mounted` hook.

---

Next: Continue with [Contributions](../contributions/index.md)

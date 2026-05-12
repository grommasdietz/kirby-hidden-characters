import "./styles/hidden-characters.css";

// ---------------------------------------------------------------------------
// Extension registry
// Third-party plugins can call registerHiddenCharactersExtension() to add
// extra target components or transform the overlay clone before insertion.
// ---------------------------------------------------------------------------

/** @type {Set<{ components?: string[], cloneTransform?: (overlayEl: HTMLElement, inputEl: HTMLElement) => void }>} */
const extensions = new Set();

/**
 * Register an extension for the hidden-characters overlay.
 *
 * @param {{ components?: string[], cloneTransform?: (overlayEl: HTMLElement, inputEl: HTMLElement) => void }} opts
 *   - components: additional Vue component names to target (e.g. ["k-blocks-input"])
 *   - cloneTransform: callback to mutate the overlay element after creation
 */
export function registerHiddenCharactersExtension(opts) {
  extensions.add(opts);
}

// Expose extension API on window so other Kirby Panel plugins can call it
// without a module import. The ??= guard makes order of script execution
// irrelevant: set the namespace if absent, then assign the function.
window.gdHiddenCharacters ??= {};
window.gdHiddenCharacters.registerExtension = registerHiddenCharactersExtension;

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

/**
 * Escapes a plain string so it is safe to inject as HTML text content.
 * @param {string | null | undefined} input
 * @returns {string}
 */
function escapeHTML(input) {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Parses `input` HTML and returns a transformed HTML string where:
 * - `<br>` tags are replaced with `<break>` custom elements
 * - Soft-hyphen characters (U+00AD) are wrapped in `<shy>` custom elements
 * - Tab characters (U+0009) are wrapped in `<tab>` custom elements
 * - All other characters (including whitespace) are left as plain text
 *   (whitespace rendering is handled via the hidden-characters font on the real input)
 *
 * @param {string} input - Raw field value or innerHTML.
 * @returns {string}
 */
function renderHiddenCharacters(input) {
  if (!input) return "";

  // Normalise newlines to <br> so textarea values behave like contenteditable
  const normalised = input.replace(/\n/g, "<br>");

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${normalised}</div>`, "text/html");
  const container = /** @type {Element} */ (doc.body.firstChild);

  /**
   * Walk the DOM tree collecting text nodes; convert <br> → <break> en route.
   * @param {Node} node
   * @param {Text[]} out
   * @returns {Text[]}
   */
  function collectTextNodes(node, out = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(/** @type {Text} */ (node));
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !["SCRIPT", "STYLE"].includes(/** @type {Element} */ (node).tagName)
    ) {
      if (/** @type {Element} */ (node).tagName === "BR") {
        // ProseMirror adds a trailing <br class="ProseMirror-trailingBreak">
        // to keep the cursor in empty/last paragraphs. p::after already
        // renders the paragraph-end glyph for those, so skip this br.
        if (
          !(
            /** @type {Element} */ (node).classList.contains(
              "ProseMirror-trailingBreak"
            )
          )
        ) {
          const breakEl = document.createElement("break");
          node.parentNode?.insertBefore(breakEl, node);
        }
        return out;
      }
      Array.from(node.childNodes).forEach((child) =>
        collectTextNodes(child, out)
      );
    }
    return out;
  }

  const textNodes = collectTextNodes(container);

  for (const textNode of textNodes) {
    const fragment = document.createDocumentFragment();

    for (const char of /** @type {string} */ (textNode.nodeValue)) {
      if (char === "\u00AD") {
        // Soft hyphen → wrap in <shy> so CSS can render a glyph via ::before
        const shy = document.createElement("shy");
        shy.textContent = char;
        fragment.appendChild(shy);
        continue;
      }
      if (char === "\u0009") {
        // Tab → wrap in <tab> so CSS can render a glyph via ::before
        const tab = document.createElement("tab");
        tab.textContent = char;
        fragment.appendChild(tab);
        continue;
      }
      // All other characters (including whitespace) stay as plain text;
      // the "spaces" font applied to the real field handles space rendering.
      fragment.appendChild(document.createTextNode(char));
    }

    textNode.replaceWith(fragment);
  }

  return container.innerHTML;
}

/**
 * Renders a plain-text textarea `value` as an overlay HTML string where:
 * - Newlines (\n) are preceded by a <break> marker and kept for pre-wrap layout
 * - Tabs (\t) are wrapped in a <tab> marker and kept for pre-wrap layout
 * - Soft hyphens (U+00AD) are wrapped in a <shy> marker
 * - All other characters are HTML-escaped plain text
 *
 * @param {string} value - Raw textarea value.
 * @returns {string}
 */
function renderTextareaContent(value) {
  if (!value) return "";
  const parts = [];
  for (const char of value) {
    if (char === "\n") {
      // Keep the newline so pre-wrap causes the line break; <break> adds the glyph
      parts.push("<break></break>\n");
    } else if (char === "\t") {
      // Keep the tab so pre-wrap renders the tab stop; <tab> adds the glyph
      parts.push("<tab>\t</tab>");
    } else if (char === "\u00AD") {
      parts.push("<shy>\u00AD</shy>");
    } else {
      parts.push(escapeHTML(char));
    }
  }
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Vue mixin
// ---------------------------------------------------------------------------

/** Attributes never copied from the real input to the overlay element. */
const IGNORED_ATTRS = new Set([
  "aria-hidden",
  "autofocus",
  "contenteditable",
  "id",
  "name",
  "placeholder",
  "spellcheck",
  "tabindex",
]);

/**
 * Build the list of component names to target, merging built-ins with any
 * registered extensions.
 * @returns {string[]}
 */
function resolveTargetComponents() {
  const base = ["k-writer-input", "k-textarea-input"];
  for (const ext of extensions) {
    if (Array.isArray(ext.components)) {
      base.push(...ext.components);
    }
  }
  return base;
}

const hiddenCharactersMixin = {
  mounted() {
    const targetComponents = resolveTargetComponents();

    if (!targetComponents.includes(this.$options.name)) {
      return;
    }

    this.$nextTick(() => {
      // -----------------------------------------------------------------------
      // Textarea branch
      // -----------------------------------------------------------------------
      if (this.$options.name === "k-textarea-input") {
        const inputEl = this.$el.querySelector?.(".k-textarea-input-native");
        if (!inputEl) return;

        const overlay = document.createElement("div");
        overlay.classList.add("gd-hidden-characters");
        overlay.setAttribute("data-tag", "textarea");
        overlay.setAttribute("aria-hidden", "true");

        // Copy typographic and spacing computed styles so overlay text reflows
        // identically to the textarea and markers land at the right positions.
        const cs = window.getComputedStyle(inputEl);
        for (const prop of [
          "font-family",
          "font-size",
          "font-weight",
          "font-style",
          "font-variation-settings",
          "line-height",
          "letter-spacing",
          "word-spacing",
          "padding-top",
          "padding-right",
          "padding-bottom",
          "padding-left",
          "border-top-width",
          "border-right-width",
          "border-bottom-width",
          "border-left-width",
          "box-sizing",
          "tab-size",
        ]) {
          overlay.style.setProperty(prop, cs.getPropertyValue(prop));
        }

        // Allow extensions to transform the overlay before insertion
        for (const ext of extensions) {
          ext.cloneTransform?.(overlay, inputEl);
        }

        /** Sync scroll position from the real textarea to the overlay */
        const syncScroll = () => {
          overlay.scrollLeft = inputEl.scrollLeft || 0;
          overlay.scrollTop = inputEl.scrollTop || 0;
        };

        /** Re-render overlay content from the textarea value */
        const updateOverlay = () => {
          overlay.innerHTML = renderTextareaContent(inputEl.value);
          syncScroll();
        };

        // Insert overlay after the textarea so `:focus-visible + &` works
        inputEl.after(overlay);
        updateOverlay();

        inputEl.addEventListener("input", updateOverlay, { passive: true });
        inputEl.addEventListener("scroll", syncScroll, { passive: true });

        this.$gdOverlay = overlay;
        this.$gdInputEl = inputEl;
        this.$gdSyncScroll = syncScroll;
        this.$gdUpdateOverlay = updateOverlay;
        return;
      }

      // -----------------------------------------------------------------------
      // Writer branch (ProseMirror)
      // -----------------------------------------------------------------------
      // Find the ProseMirror editable node inside the writer component
      const inputEl = this.$el.querySelector?.(".ProseMirror");

      if (!inputEl) return;

      // Build the overlay element
      const overlay = document.createElement("div");

      for (const attr of inputEl.attributes) {
        if (!IGNORED_ATTRS.has(attr.name)) {
          overlay.setAttribute(attr.name, attr.value);
        }
      }

      overlay.classList.add("gd-hidden-characters");
      overlay.setAttribute("data-tag", inputEl.tagName.toLowerCase());
      overlay.setAttribute("aria-hidden", "true");

      // Allow extensions to transform the overlay before insertion
      for (const ext of extensions) {
        ext.cloneTransform?.(overlay, inputEl);
      }

      /** Sync scroll position from the real input to the overlay */
      const syncScroll = () => {
        overlay.scrollLeft = inputEl.scrollLeft || 0;
        overlay.scrollTop = inputEl.scrollTop || 0;
      };

      /** Re-render overlay content and keep scroll in sync */
      const updateOverlay = () => {
        overlay.innerHTML = renderHiddenCharacters(inputEl.innerHTML);
        syncScroll();
      };

      // Insert overlay after the real input so the CSS `:focus + &` selector works
      inputEl.after(overlay);

      // Initial render
      updateOverlay();

      // ProseMirror DOM mutations drive updates (no value watcher needed)
      this.$gdObserver = new MutationObserver(updateOverlay);
      this.$gdObserver.observe(inputEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      // Keep overlay scroll position in sync during user interaction
      inputEl.addEventListener("scroll", syncScroll, { passive: true });
      inputEl.addEventListener("input", syncScroll);

      this.$gdOverlay = overlay;
      this.$gdSyncScroll = syncScroll;
      this.$gdUpdateOverlay = updateOverlay;
      this.$gdInputEl = inputEl;
    });
  },

  beforeDestroy() {
    this.$gdObserver?.disconnect();

    if (this.$gdInputEl && this.$gdSyncScroll) {
      this.$gdInputEl.removeEventListener("scroll", this.$gdSyncScroll);
      this.$gdInputEl.removeEventListener("input", this.$gdSyncScroll);
    }

    // Textarea uses updateOverlay on `input`; remove it separately
    if (this.$gdInputEl && this.$gdUpdateOverlay) {
      this.$gdInputEl.removeEventListener("input", this.$gdUpdateOverlay);
    }
  },

  watch: {
    // Writer overlay is driven by MutationObserver.
    // Textarea overlay is driven by the native `input` event.
    // No Vue watcher needed for either.
  },
};

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

window.panel.plugin("grommasdietz/hidden-characters", {
  use: [
    (Vue) => {
      Vue.mixin(hiddenCharactersMixin);
    },
  ],
});

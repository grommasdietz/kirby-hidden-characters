import "./styles/hidden-characters.css";

// ---------------------------------------------------------------------------
// Extension registry
// Third-party plugins can add target components or adjust the non-interactive
// overlay layer before it is inserted.
// ---------------------------------------------------------------------------

/** @type {Set<{ components?: string[], cloneTransform?: (overlayEl: HTMLElement, inputEl: HTMLElement) => void }>} */
const extensions = new Set();

/**
 * Register an extension for the hidden-characters overlay.
 *
 * @param {{ components?: string[], cloneTransform?: (overlayEl: HTMLElement, inputEl: HTMLElement) => void }} opts
 *   - components: additional Vue component names to target
 *   - cloneTransform: callback to mutate the overlay element before insertion
 */
export function registerHiddenCharactersExtension(opts) {
  extensions.add(opts);
}

window.gdHiddenCharacters ??= {};
window.gdHiddenCharacters.registerExtension = registerHiddenCharactersExtension;

// ---------------------------------------------------------------------------
// Textarea HTML helpers
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
 * Renders a plain-text textarea value for its grid-aligned mirror.
 * Newline and tab characters remain in the mirrored text so browser layout
 * continues to follow the textarea's `pre-wrap` behavior.
 *
 * @param {string} value
 * @returns {string}
 */
function renderTextareaContent(value) {
  if (!value) return "";

  const parts = [];

  for (const char of value) {
    if (char === "\n") {
      parts.push("<break></break>\n");
    } else if (char === "\t") {
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
// Writer marker geometry
// ---------------------------------------------------------------------------

/**
 * @param {Range} range
 * @param {boolean} [preferLast=false]
 * @returns {DOMRect | null}
 */
function rangeRect(range, preferLast = false) {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0
  );

  if (rects.length > 0) {
    return preferLast ? rects.at(-1) ?? null : rects[0] ?? null;
  }

  const rect = range.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0 ? rect : null;
}

/**
 * Creates a zero-width caret-like rectangle at the end of a visible range.
 *
 * @param {Range} range
 * @returns {{ left: number, right: number, top: number, bottom: number, width: number, height: number } | null}
 */
function rangeEndRect(range) {
  const rect = rangeRect(range, true);
  if (!rect) return null;

  return {
    left: rect.right,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: 0,
    height: rect.height,
  };
}

/**
 * Finds the last text character inside an element, optionally stopping before
 * a ProseMirror trailing-break placeholder.
 *
 * @param {Element} element
 * @param {Node | null} stopBefore
 * @returns {Range | null}
 */
function lastCharacterRange(element, stopBefore = null) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  /** @type {Text | null} */
  let last = null;
  /** @type {Node | null} */
  let node = walker.nextNode();

  while (node) {
    if (
      stopBefore &&
      (node.compareDocumentPosition(stopBefore) &
        Node.DOCUMENT_POSITION_PRECEDING) !==
        0
    ) {
      break;
    }

    if ((node.nodeValue?.length ?? 0) > 0) {
      last = /** @type {Text} */ (node);
    }

    node = walker.nextNode();
  }

  if (!last || !last.nodeValue) return null;

  const range = document.createRange();
  range.setStart(last, last.nodeValue.length - 1);
  range.setEnd(last, last.nodeValue.length);
  return range;
}

/**
 * Returns the visual caret position at the end of a paragraph without letting
 * ProseMirror's trailing `<br>` move the marker onto an artificial next line.
 *
 * @param {HTMLParagraphElement} paragraph
 * @returns {{ left: number, right: number, top: number, bottom: number, width: number, height: number } | DOMRect | null}
 */
function paragraphEndRect(paragraph) {
  const trailingBreak = paragraph.querySelector(
    ":scope > br.ProseMirror-trailingBreak:last-child"
  );
  const range = document.createRange();
  range.selectNodeContents(paragraph);

  if (trailingBreak) {
    range.setEndBefore(trailingBreak);
  }

  range.collapse(false);

  const collapsedRect = rangeRect(range, true);
  if (collapsedRect) return collapsedRect;

  const characterRange = lastCharacterRange(paragraph, trailingBreak);
  if (characterRange) {
    return rangeEndRect(characterRange);
  }

  const paragraphRect = paragraph.getBoundingClientRect();
  if (paragraphRect.width > 0 || paragraphRect.height > 0) {
    return {
      left: paragraphRect.left,
      right: paragraphRect.left,
      top: paragraphRect.top,
      bottom: paragraphRect.bottom,
      width: 0,
      height: paragraphRect.height,
    };
  }

  return null;
}

/**
 * @param {HTMLElement} overlay
 * @param {string} type
 * @param {{ left: number, top: number, width: number, height: number }} rect
 */
function appendMarker(overlay, type, rect) {
  const overlayRect = overlay.getBoundingClientRect();
  const scaleX = overlay.offsetWidth > 0 ? overlayRect.width / overlay.offsetWidth : 1;
  const scaleY = overlay.offsetHeight > 0 ? overlayRect.height / overlay.offsetHeight : 1;
  const marker = document.createElement("span");

  marker.className = "gd-hidden-character-marker";
  marker.dataset.character = type;
  marker.style.left = `${(rect.left - overlayRect.left) / scaleX}px`;
  marker.style.top = `${(rect.top - overlayRect.top) / scaleY}px`;
  marker.style.width = `${rect.width / scaleX}px`;
  marker.style.height = `${rect.height / scaleY}px`;
  overlay.appendChild(marker);
}

/**
 * Builds marker positions from the real ProseMirror DOM. The overlay contains
 * no mirrored text, so spaces and no-break spaces can never be reflowed by a
 * second formatting context.
 *
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} overlay
 */
function renderWriterMarkers(inputEl, overlay) {
  overlay.replaceChildren();

  const paragraphs = Array.from(
    inputEl.querySelectorAll("p")
  );

  paragraphs.forEach((paragraph, index) => {
    const trailingBreak = paragraph.querySelector(
      ":scope > br.ProseMirror-trailingBreak:last-child"
    );
    const isSingleEmptyParagraph =
      paragraphs.length === 1 &&
      Boolean(trailingBreak) &&
      (paragraph.textContent ?? "") === "";

    if (!isSingleEmptyParagraph) {
      const rect = paragraphEndRect(
        /** @type {HTMLParagraphElement} */ (paragraph)
      );

      if (rect) {
        appendMarker(
          overlay,
          index === paragraphs.length - 1 ? "paragraph-last" : "paragraph",
          rect
        );
      }
    }
  });

  for (const breakEl of inputEl.querySelectorAll(
    "br:not(.ProseMirror-trailingBreak)"
  )) {
    const range = document.createRange();
    range.setStartBefore(breakEl);
    range.collapse(true);
    const rect = rangeRect(range, true) ?? breakEl.getBoundingClientRect();

    if (rect.width > 0 || rect.height > 0) {
      appendMarker(overlay, "break", rect);
    }
  }

  const walker = document.createTreeWalker(inputEl, NodeFilter.SHOW_TEXT);
  /** @type {Node | null} */
  let node = walker.nextNode();

  while (node) {
    const textNode = /** @type {Text} */ (node);
    const value = textNode.nodeValue ?? "";

    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (char !== "\u00AD" && char !== "\u0009") continue;

      const range = document.createRange();
      range.setStart(textNode, index);
      range.setEnd(textNode, index + 1);
      const rect = rangeRect(range, false);

      if (rect) {
        appendMarker(overlay, char === "\u00AD" ? "shy" : "tab", rect);
      }
    }

    node = walker.nextNode();
  }
}

// ---------------------------------------------------------------------------
// Vue mixin
// ---------------------------------------------------------------------------

/**
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
    if (!resolveTargetComponents().includes(this.$options.name)) {
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

        const computedStyle = window.getComputedStyle(inputEl);
        for (const property of [
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
          overlay.style.setProperty(
            property,
            computedStyle.getPropertyValue(property)
          );
        }

        for (const ext of extensions) {
          ext.cloneTransform?.(overlay, inputEl);
        }

        const syncScroll = () => {
          overlay.scrollLeft = inputEl.scrollLeft || 0;
          overlay.scrollTop = inputEl.scrollTop || 0;
        };

        const updateOverlay = () => {
          overlay.innerHTML = renderTextareaContent(inputEl.value);
          syncScroll();
        };

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
      const inputEl = this.$el.querySelector?.(".ProseMirror");
      if (!inputEl) return;

      const overlay = document.createElement("div");
      overlay.classList.add(
        "gd-hidden-characters",
        "gd-hidden-characters--writer-markers"
      );
      overlay.setAttribute("data-tag", "writer-markers");
      overlay.setAttribute("aria-hidden", "true");

      for (const ext of extensions) {
        ext.cloneTransform?.(overlay, inputEl);
      }

      inputEl.after(overlay);

      let animationFrame = 0;
      const renderMarkers = () => {
        animationFrame = 0;
        renderWriterMarkers(inputEl, overlay);
      };
      const scheduleMarkers = () => {
        // The layer is only visible while the editor is focused. Defer all
        // geometry work while blurred and perform one complete refresh when
        // focus returns. Multiple triggers in the same frame are coalesced.
        if (
          !overlay.isConnected ||
          !inputEl.matches(":focus") ||
          animationFrame !== 0
        ) {
          return;
        }

        animationFrame = window.requestAnimationFrame(renderMarkers);
      };

      scheduleMarkers();

      this.$gdObserver = new MutationObserver(scheduleMarkers);
      this.$gdObserver.observe(inputEl, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });

      const resizeObserver = new ResizeObserver(scheduleMarkers);
      resizeObserver.observe(inputEl);
      resizeObserver.observe(this.$el);

      inputEl.addEventListener("focus", scheduleMarkers, { passive: true });
      inputEl.addEventListener("input", scheduleMarkers, { passive: true });
      inputEl.addEventListener("scroll", scheduleMarkers, { passive: true });
      window.addEventListener("resize", scheduleMarkers, { passive: true });

      const fontLoadingDone = () => scheduleMarkers();
      document.fonts?.addEventListener?.("loadingdone", fontLoadingDone);
      document.fonts?.ready?.then(scheduleMarkers);

      this.$gdOverlay = overlay;
      this.$gdInputEl = inputEl;
      this.$gdScheduleMarkers = scheduleMarkers;
      this.$gdResizeObserver = resizeObserver;
      this.$gdWindowResize = scheduleMarkers;
      this.$gdFontLoadingDone = fontLoadingDone;
      this.$gdAnimationFrame = () => animationFrame;
    });
  },

  beforeDestroy() {
    this.$gdObserver?.disconnect();
    this.$gdResizeObserver?.disconnect();

    if (this.$gdInputEl && this.$gdSyncScroll) {
      this.$gdInputEl.removeEventListener("scroll", this.$gdSyncScroll);
    }

    if (this.$gdInputEl && this.$gdUpdateOverlay) {
      this.$gdInputEl.removeEventListener("input", this.$gdUpdateOverlay);
    }

    if (this.$gdInputEl && this.$gdScheduleMarkers) {
      this.$gdInputEl.removeEventListener("focus", this.$gdScheduleMarkers);
      this.$gdInputEl.removeEventListener("input", this.$gdScheduleMarkers);
      this.$gdInputEl.removeEventListener("scroll", this.$gdScheduleMarkers);
    }

    if (this.$gdWindowResize) {
      window.removeEventListener("resize", this.$gdWindowResize);
    }

    if (this.$gdFontLoadingDone) {
      document.fonts?.removeEventListener?.(
        "loadingdone",
        this.$gdFontLoadingDone
      );
    }

    const animationFrame = this.$gdAnimationFrame?.() ?? 0;
    if (animationFrame !== 0) {
      window.cancelAnimationFrame(animationFrame);
    }

    this.$gdOverlay?.remove();
  },

  watch: {},
};

window.panel.plugin("grommasdietz/hidden-characters", {
  use: [
    (Vue) => {
      Vue.mixin(hiddenCharactersMixin);
    },
  ],
});

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

const writerCharacterMarkers = new Map([
  ["\u0020", { character: "space", glyph: "\u0020" }],
  ["\u00a0", { character: "no-break-space", glyph: "\u00a0" }],
  ["\u2000", { character: "en-quad", glyph: "\u2000" }],
  ["\u2001", { character: "em-quad", glyph: "\u2001" }],
  ["\u2002", { character: "en-space", glyph: "\u2002" }],
  ["\u2003", { character: "em-space", glyph: "\u2003" }],
  ["\u2004", { character: "three-per-em-space", glyph: "\u2004" }],
  ["\u2005", { character: "four-per-em-space", glyph: "\u2005" }],
  ["\u2006", { character: "six-per-em-space", glyph: "\u2006" }],
  ["\u2007", { character: "figure-space", glyph: "\u2007" }],
  ["\u2008", { character: "punctuation-space", glyph: "\u2008" }],
  ["\u2009", { character: "thin-space", glyph: "\u2009" }],
  ["\u200a", { character: "hair-space", glyph: "\u200a" }],
  ["\u200b", { character: "zero-width-space", glyph: "\u200b" }],
  ["\u202f", { character: "narrow-no-break-space", glyph: "\u202f" }],
  ["\u205f", { character: "medium-mathematical-space", glyph: "\u205f" }],
  ["\u00ad", { character: "shy", glyph: "\ue003" }],
  ["\u0009", { character: "tab", glyph: "\ue004" }],
]);

/**
 * @param {Range} range
 * @param {boolean} [preferLast=false]
 * @returns {DOMRect | null}
 */
function rangeRect(range, preferLast = false) {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0
  );
  // WebKit can prepend/append a zero-width fragment from the neighbouring
  // text run, notably at NBSP and mark boundaries or after wrapping. Prefer
  // the character's advance box; retain caret boxes for genuinely zero-width
  // characters and collapsed ranges. A bounding union can span two lines.
  const advanceRects = rects.filter((rect) => rect.width > 0);
  const candidates = advanceRects.length > 0 ? advanceRects : rects;

  if (candidates.length > 0) {
    return preferLast ? candidates.at(-1) ?? null : candidates[0] ?? null;
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
 * @param {{ fragment: DocumentFragment, overlayRect: DOMRect, scaleX: number, scaleY: number, typography: WeakMap<Element, { fontSize: string, monospace: boolean }> }} context
 * @param {string} type
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {string} glyph
 * @param {Element | null} sourceElement
 */
function appendMarker(context, type, rect, glyph, sourceElement = null) {
  const marker = document.createElement("span");

  marker.className = "gd-hidden-character-marker";
  marker.dataset.character = type;
  marker.dataset.glyph = glyph;
  marker.style.left = `${(rect.left - context.overlayRect.left) / context.scaleX}px`;
  marker.style.top = `${(rect.top - context.overlayRect.top) / context.scaleY}px`;
  marker.style.width = `${rect.width / context.scaleX}px`;
  marker.style.height = `${rect.height / context.scaleY}px`;

  if (sourceElement) {
    marker.dataset.sourceTag = sourceElement.localName;
    let typography = context.typography.get(sourceElement);

    if (!typography) {
      typography = {
        fontSize: window.getComputedStyle(sourceElement).fontSize,
        monospace: Boolean(sourceElement.closest("code")),
      };
      context.typography.set(sourceElement, typography);
    }

    marker.style.setProperty("--gd-hc-font-size", typography.fontSize);
    if (typography.monospace) marker.dataset.font = "monospace";
  }

  context.fragment.appendChild(marker);
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
  const overlayRect = overlay.getBoundingClientRect();
  const context = {
    fragment: document.createDocumentFragment(),
    overlayRect,
    scaleX:
      overlay.offsetWidth > 0 ? overlayRect.width / overlay.offsetWidth : 1,
    scaleY:
      overlay.offsetHeight > 0 ? overlayRect.height / overlay.offsetHeight : 1,
    typography: new WeakMap(),
  };

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
          context,
          index === paragraphs.length - 1 ? "paragraph-last" : "paragraph",
          rect,
          index === paragraphs.length - 1 ? "\ue001" : "\ue000",
          paragraph
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
      appendMarker(context, "break", rect, "\ue002", breakEl.parentElement);
    }
  }

  const walker = document.createTreeWalker(inputEl, NodeFilter.SHOW_TEXT);
  /** @type {Node | null} */
  let node = walker.nextNode();

  while (node) {
    const textNode = /** @type {Text} */ (node);
    const value = textNode.nodeValue ?? "";

    for (let index = 0; index < value.length; index += 1) {
      const markerDefinition = writerCharacterMarkers.get(value[index]);
      if (!markerDefinition) continue;

      const range = document.createRange();
      range.setStart(textNode, index);
      range.setEnd(textNode, index + 1);
      const rect = rangeRect(range, false);

      if (rect) {
        appendMarker(
          context,
          markerDefinition.character,
          rect,
          markerDefinition.glyph,
          textNode.parentElement
        );
      }
    }

    node = walker.nextNode();
  }

  overlay.replaceChildren(context.fragment);
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
        overlay.parentElement.setAttribute("data-hidden-characters", "");
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
      const isWriterFocused = () =>
        document.activeElement === inputEl ||
        inputEl.matches(":focus") ||
        inputEl.classList.contains("ProseMirror-focused");
      const scheduleMarkers = () => {
        // The layer is only visible while the editor is focused. Defer all
        // geometry work while blurred and perform one complete refresh when
        // focus returns. Multiple triggers in the same frame are coalesced.
        if (
          !overlay.isConnected ||
          !isWriterFocused() ||
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

      const writerRefreshEvents = [
        "focus",
        "input",
        "scroll",
        "pointerover",
        "pointerout",
        "transitionrun",
        "transitionend",
      ];
      for (const event of writerRefreshEvents) {
        inputEl.addEventListener(event, scheduleMarkers, { passive: true });
      }
      window.addEventListener("resize", scheduleMarkers, { passive: true });

      const fontLoadingDone = () => scheduleMarkers();
      document.fonts?.addEventListener?.("loadingdone", fontLoadingDone);
      document.fonts?.ready?.then(scheduleMarkers);

      this.$gdOverlay = overlay;
      this.$gdInputEl = inputEl;
      this.$gdScheduleMarkers = scheduleMarkers;
      this.$gdWriterRefreshEvents = writerRefreshEvents;
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
      for (const event of this.$gdWriterRefreshEvents ?? []) {
        this.$gdInputEl.removeEventListener(event, this.$gdScheduleMarkers);
      }
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

    if (this.$gdOverlay?.dataset.tag === "textarea") {
      this.$gdOverlay.parentElement?.removeAttribute("data-hidden-characters");
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

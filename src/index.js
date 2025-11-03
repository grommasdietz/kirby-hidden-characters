import "./styles/hidden-characters.scss";

/**
 * Parses a string and wraps special characters in custom HTML tags
 * for targeted CSS styling.
 * @param {string} input - The raw value from a Kirby field.
 * @returns {string} The processed HTML string.
 */
function escapeHTML(input) {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHiddenCharacters(input) {
  // Return an empty string for null or empty inputs to prevent errors.
  if (!input) {
    return "";
  }

  // Normalize newline characters to <br> tags to make textarea values
  // behave like contenteditable innerHTML
  const normalizedInput = input.replace(/\n/g, "<br>");

  const parser = new DOMParser();
  // Wrap input in a root <div> to ensure consistent parsing.
  const doc = parser.parseFromString(
    `<div>${normalizedInput}</div>`,
    "text/html"
  );
  const container = doc.body.firstChild;

  /**
   * Recursively finds all text nodes for processing and standardizes
   * <br> tags into custom <break> elements.
   * @param {Node} node - The current node to process.
   * @param {Text[]} out - An accumulator for found text nodes.
   * @returns {Text[]}
   */
  function collectTextNodes(node, out = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node);
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      !["SCRIPT", "STYLE"].includes(node.tagName)
    ) {
      // Convert <br> tags into a custom element for consistent styling.
      if (node.tagName === "BR") {
        const breakEl = document.createElement("break");
        node.parentNode.insertBefore(breakEl, node);
      }
      Array.from(node.childNodes).forEach((child) =>
        collectTextNodes(child, out)
      );
    }
    return out;
  }

  const textNodes = collectTextNodes(container);

  // Iterate over each found text node to wrap special characters.
  for (const textNode of textNodes) {
    const fragment = document.createDocumentFragment();

    for (const char of textNode.nodeValue) {
      if (char.match(/[\s\u00A0]/)) {
        const space = document.createElement("space");
        // Store the original character for CSS to use with `attr()`.
        space.setAttribute("data-character", char);
        // The original character is also placed inside the tag.
        // It will be made transparent by the CSS.
        space.textContent = char;
        fragment.appendChild(space);
      } else if (char === "\u00AD") {
        const shy = document.createElement("shy");
        shy.textContent = char;
        fragment.appendChild(shy);
      } else {
        fragment.appendChild(document.createTextNode(char));
      }
    }

    // Replace the original text node with the new, enhanced fragment.
    textNode.replaceWith(fragment);
  }

  return container.innerHTML;
}

window.panel.plugin("grommasdietz/hidden-characters", {
  use: [
    (Vue) => {
      // Define which Kirby components this plugin will enhance.
      const targetComponents = [
        "k-writer-input",
        "k-textarea-input",
        "k-text-input",
      ];

      Vue.mixin({
        mounted() {
          if (!targetComponents.includes(this.$options.name)) {
            return;
          }

          this.$nextTick(() => {
            const inputEl = this.$el.matches(".k-text-input")
              ? this.$el
              : this.$el.querySelector(
                  ".ProseMirror, .k-textarea-input-native"
                );

            if (!inputEl) {
              return;
            }

            this.$overlayEl = document.createElement("div");
            // ... (Your attribute copying logic remains the same)
            const ignoredAttrs = [
              "aria-hidden",
              "autofocus",
              "contenteditable",
              "id",
              "name",
              "placeholder",
              "spellcheck",
              "tabindex",
            ];
            for (const attr of inputEl.attributes) {
              if (!ignoredAttrs.includes(attr.name)) {
                this.$overlayEl.setAttribute(attr.name, attr.value);
              }
            }

            this.$overlayEl.classList.add("gd-hidden-characters");
            this.$overlayEl.setAttribute(
              "data-tag",
              inputEl.tagName.toLowerCase()
            );
            this.$overlayEl.setAttribute("aria-hidden", "true");
            this.$overlayEl.inert = true;

            // --- START: MODIFICATION ---

            // The function to update the overlay's content.
            const updateOverlay = () => {
              // For Writer fields, get content from innerHTML. For others, use the value.
              let content = inputEl.matches(".ProseMirror")
                ? inputEl.innerHTML
                : this.value;

              // For non-writer fields, escape HTML so it is treated as text
              if (!inputEl.matches(".ProseMirror")) {
                content = escapeHTML(content || "");
              }

              this.$overlayEl.innerHTML = renderHiddenCharacters(content || "");
            };

            // Initial render.
            updateOverlay();

            // Insert the overlay into the DOM.
            inputEl.after(this.$overlayEl);

            // For Writer fields, the 'value' watcher is unreliable for empty states.
            // We must use a MutationObserver to watch the editor DOM directly.
            if (inputEl.matches(".ProseMirror")) {
              this.$observer = new MutationObserver(updateOverlay);
              this.$observer.observe(inputEl, {
                childList: true,
                subtree: true,
                characterData: true,
              });
            }
            // --- END: MODIFICATION ---
          });
        },

        // Clean up the observer when the component is destroyed.
        beforeDestroy() {
          if (this.$observer) {
            this.$observer.disconnect();
          }
        },

        watch: {
          // The watcher is still useful for simple inputs like <textarea> and <input>.
          value(newVal) {
            // Only run this watcher for non-ProseMirror elements.
            if (
              !targetComponents.includes(this.$options.name) ||
              !this.$overlayEl ||
              this.$el.querySelector(".ProseMirror")
            ) {
              return;
            }
            // Escape HTML so it is treated as text in non-writer fields
            const processedVal = escapeHTML(newVal || "");
            this.$overlayEl.innerHTML = renderHiddenCharacters(processedVal);
          },
        },
      });
    },
  ],
});

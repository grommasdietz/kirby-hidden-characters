import './styles/hidden-characters.scss';

/**
 * Parses a string and wraps special characters in custom HTML tags
 * for targeted CSS styling.
 * @param {string} input - The raw value from a Kirby field.
 * @returns {string} The processed HTML string.
 */
function renderHiddenCharacters(input) {
  // Return an empty string for null or empty inputs to prevent errors.
  if (!input) {
    return '';
  }

  const parser = new DOMParser();
  // Wrap input in a root <div> to ensure consistent parsing.
  const doc = parser.parseFromString(`<div>${input}</div>`, 'text/html');
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
      !['SCRIPT', 'STYLE'].includes(node.tagName)
    ) {
      // Convert <br> tags into a custom element for consistent styling.
      if (node.tagName === 'BR') {
        const breakEl = document.createElement('break');
        node.parentNode.insertBefore(breakEl, node);
      }
      Array.from(node.childNodes).forEach((child) =>
        collectTextNodes(child, out),
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
        const space = document.createElement('space');
        // Store the original character for CSS to use with `attr()`.
        space.setAttribute('data-character', char);
        // The original character is also placed inside the tag.
        // It will be made transparent by the CSS.
        space.textContent = char;
        fragment.appendChild(space);
      } else if (char === '\u00AD') {
        const shy = document.createElement('shy');
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

window.panel.plugin('grommasdietz/hidden-characters', {
  use: [
    (Vue) => {
      // Define which Kirby components this plugin will enhance.
      const targetComponents = [
        'k-writer-input',
        'k-textarea-input',
        'k-text-input',
      ];

      Vue.mixin({
        mounted() {
          if (!targetComponents.includes(this.$options.name)) {
            return;
          }

          // Defer execution until the component's DOM is fully rendered.
          // This is crucial for complex components like the Writer.
          this.$nextTick(() => {
            // Find the interactive element to overlay. The logic is split:
            // k-text-input's root element *is* the input. For others,
            // we query for the element within the component.
            const inputEl = this.$el.matches('.k-text-input')
              ? this.$el
              : this.$el.querySelector(
                  '.ProseMirror, .k-textarea-input-native',
                );

            if (!inputEl) {
              return; // Failsafe if no target element is found.
            }

            // Create the overlay element.
            this.$overlayEl = document.createElement('div');

            // Copy attributes from the source element to the overlay.
            // This ensures styles based on attributes (e.g., `[dir="rtl"]`) are matched.
            const ignoredAttrs = [
              'aria-hidden',
              'autofocus',
              'contenteditable',
              'id',
              'name',
              'placeholder',
              'spellcheck',
              'tabindex',
            ];
            for (const attr of inputEl.attributes) {
              if (!ignoredAttrs.includes(attr.name)) {
                this.$overlayEl.setAttribute(attr.name, attr.value);
              }
            }

            // Add our main class for overlay styling.
            this.$overlayEl.classList.add('gd-hidden-characters');

            // "Tag" the overlay with the source element's tag name.
            // This lets CSS apply tag-specific rules (e.g., line-height).
            this.$overlayEl.setAttribute(
              'data-tag',
              inputEl.tagName.toLowerCase(),
            );

            // Make the overlay non-interactive and inaccessible.
            this.$overlayEl.setAttribute('aria-hidden', 'true');
            this.$overlayEl.inert = true;

            // Render the initial value into the overlay.
            this.$overlayEl.innerHTML = renderHiddenCharacters(
              this.value || '',
            );

            // Insert the overlay into the DOM directly after the input element.
            inputEl.after(this.$overlayEl);
          });
        },
        watch: {
          // When the field's value changes, re-render the overlay.
          value(newVal) {
            if (
              !targetComponents.includes(this.$options.name) ||
              !this.$overlayEl
            ) {
              return;
            }
            this.$overlayEl.innerHTML = renderHiddenCharacters(newVal || '');
          },
        },
      });
    },
  ],
});

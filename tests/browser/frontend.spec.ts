import { expect, test, type Page } from "@playwright/test";

const PANEL_EMAIL =
  process.env.KIRBY_USER_EMAIL ?? "admin@kirby-hidden-characters.test";
const PANEL_PASSWORD = process.env.KIRBY_USER_PASSWORD ?? "playwright";

async function discardHomeChanges(page: Page) {
  await page.evaluate(async () => {
    const panelWindow = window as typeof window & {
      panel?: { api?: { post: (path: string) => Promise<unknown> } };
    };

    await panelWindow.panel?.api?.post("pages/home/changes/discard");
  });
}

test.describe("Panel: hidden-characters rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/panel/login");
    await page.getByLabel("Email").fill(PANEL_EMAIL);
    await page.getByLabel("Password").fill(PANEL_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/panel/);
    await discardHomeChanges(page);
  });

  test.afterEach(async ({ page }) => {
    if (!page.isClosed() && page.url().includes("/panel")) {
      await discardHomeChanges(page);
    }
  });

  // ---------------------------------------------------------------------------
  // Writer field
  // ---------------------------------------------------------------------------

  test("overlay is injected next to the writer field after focus", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await proseMirror.click();

    const overlay = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"] + .gd-hidden-characters'
    );
    await expect(overlay).toBeAttached();
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
    await expect(overlay).toHaveAttribute("data-tag", "writer-markers");
  });

  test("writer marker layer contains no mirrored text", async ({ page }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await proseMirror.click();

    const overlay = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"] + .gd-hidden-characters'
    );
    await expect(overlay).toBeAttached();
    await expect(overlay).toHaveText("");
    await expect(overlay.locator("p, break, shy, tab")).toHaveCount(0);
    await expect(
      overlay.locator('.gd-hidden-character-marker[data-character="shy"]').first()
    ).toBeAttached();
    await expect(
      overlay.locator('.gd-hidden-character-marker[data-character="break"]').first()
    ).toBeAttached();
    await expect(
      overlay.locator('.gd-hidden-character-marker[data-character="space"]').first()
    ).toBeAttached();
    await expect(
      overlay
        .locator('.gd-hidden-character-marker[data-character="no-break-space"]')
        .first()
    ).toBeAttached();
    await expect(
      overlay
        .locator('.gd-hidden-character-marker[data-character="zero-width-space"]')
        .first()
    ).toBeAttached();
  });

  test("overlay bounding box matches the writer field within 2 px", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await proseMirror.click();

    const overlay = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"] + .gd-hidden-characters'
    );
    await expect(overlay).toBeAttached();

    const inputBox = await proseMirror.boundingBox();
    const overlayBox = await overlay.boundingBox();

    expect(inputBox).not.toBeNull();
    expect(overlayBox).not.toBeNull();

    expect(Math.abs((overlayBox?.x ?? 0) - (inputBox?.x ?? 0))).toBeLessThan(2);
    expect(Math.abs((overlayBox?.y ?? 0) - (inputBox?.y ?? 0))).toBeLessThan(2);
    expect(
      Math.abs((overlayBox?.width ?? 0) - (inputBox?.width ?? 0))
    ).toBeLessThan(2);
    expect(
      Math.abs((overlayBox?.height ?? 0) - (inputBox?.height ?? 0))
    ).toBeLessThan(2);
  });

  test("writer keeps Kirby typography while native fields keep the whitespace font", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    const writerFontFamily = await proseMirror.evaluate(
      (el) => window.getComputedStyle(el).fontFamily
    );
    const writerPalette = await proseMirror.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue("font-palette")
    );
    const codeFontFamily = await proseMirror.locator("code").evaluate(
      (el) => window.getComputedStyle(el).fontFamily
    );
    const textareaFontFamily = await page
      .locator(".k-field-name-textarea .k-textarea-input-native")
      .evaluate((el) => window.getComputedStyle(el).fontFamily);
    const textFontFamily = await page
      .locator(".k-field-name-text .k-text-input")
      .evaluate((el) => window.getComputedStyle(el).fontFamily);

    expect(writerFontFamily.toLowerCase()).not.toContain("hidden-characters");
    expect(writerPalette).toBe("normal");
    expect(codeFontFamily.toLowerCase()).not.toContain("hidden-characters");
    expect(textareaFontFamily.toLowerCase()).toContain("hidden-characters");
    expect(textFontFamily.toLowerCase()).toContain("hidden-characters");
  });

  test("writer markers follow built-in, nested and custom mark typography", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    const panel = page.locator(".k-panel");

    await page.addStyleTag({
      content: `
        .k-panel {
          --link-color: light-dark(rgb(181, 45, 116), rgb(111, 207, 169));
          --link-color-hover: light-dark(rgb(217, 90, 36), rgb(242, 188, 74));
        }

        .k-writer-input .ProseMirror strong {
          color: light-dark(rgb(57, 92, 196), rgb(197, 153, 255));
        }

        .k-writer-input .ProseMirror a[href="#custom"] {
          color: rgb(116, 67, 35);
          font-family: Georgia, serif;
          font-size: 20px;
        }

        .k-writer-input .ProseMirror a[href="#custom"]:hover {
          color: rgb(31, 125, 81);
          font-size: 24px;
        }
      `,
    });

    await proseMirror.click();
    await proseMirror.evaluate((element) => {
      element.innerHTML = `
        <p>
          <a href="#">Link\u00a0text</a>
          <strong>Bold\u00a0text</strong>
          <em>Italic\u00a0text</em>
          <code>Code\u00a0text</code>
          <u>Underlined\u00a0text</u>
          <s>Struck\u00a0text</s>
          <sub>Subscript\u00a0text</sub>
          <sup>Superscript\u00a0text</sup>
          <a href="#custom">Custom\u00a0text</a>
          <a href="#"><em>Nested\u00a0link</em></a>
        </p>
      `;
    });

    const link = proseMirror.getByRole("link", { name: "Link text", exact: true });
    const mark = proseMirror.locator("strong");
    const customMark = proseMirror.getByRole("link", {
      name: "Custom text",
      exact: true,
    });
    const overlay = proseMirror.locator("+ .gd-hidden-characters");
    const noBreakMarkers = overlay.locator(
      '.gd-hidden-character-marker[data-character="no-break-space"]'
    );

    await expect(link).toBeVisible();
    await expect(mark).toBeVisible();
    await expect(noBreakMarkers).toHaveCount(10);
    await expect(overlay).toHaveCSS("opacity", "1");
    await expect(link).toHaveCSS("color", "rgb(181, 45, 116)");
    await expect(mark).toHaveCSS("color", "rgb(57, 92, 196)");
    expect(
      await noBreakMarkers.first().evaluate((element) =>
        window
          .getComputedStyle(element, "::before")
          .getPropertyValue("font-palette")
      )
    ).toBe("--gd-hc-light");

    for (const element of await proseMirror
      .locator("a, strong, em, code, u, s, sub, sup")
      .all()) {
      const fontFamily = await element.evaluate(
        (node) => window.getComputedStyle(node).fontFamily
      );
      expect(fontFamily.toLowerCase()).not.toContain("hidden-characters");
    }

    await expect(proseMirror.locator("strong")).not.toHaveCSS("font-weight", "400");
    await expect(proseMirror.locator("em").first()).toHaveCSS("font-style", "italic");
    await expect(proseMirror.locator("u")).toHaveCSS(
      "text-decoration-line",
      "underline"
    );
    await expect(proseMirror.locator("s")).toHaveCSS(
      "text-decoration-line",
      "line-through"
    );

    const codeMarker = overlay.locator(
      '.gd-hidden-character-marker[data-source-tag="code"][data-font="monospace"]'
    );
    await expect(codeMarker).toHaveCount(1);
    expect(
      await codeMarker.evaluate((element) =>
        window
          .getComputedStyle(element, "::before")
          .getPropertyValue("font-variation-settings")
      )
    ).toContain('"MONO" 1');

    const customMarkers = overlay.locator(
      '.gd-hidden-character-marker[data-source-tag="a"]'
    );
    expect(
      await customMarkers.evaluateAll((elements) =>
        elements.some(
          (element) =>
            element.style.getPropertyValue("--gd-hc-font-size") === "20px"
        )
      )
    ).toBe(true);

    await link.hover();
    await expect(link).toHaveCSS("color", "rgb(217, 90, 36)");

    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS("color", "rgb(181, 45, 116)");
    await panel.evaluate((element) => {
      element.style.setProperty(
        "--link-color",
        "light-dark(rgb(24, 68, 112), rgb(178, 214, 240))"
      );
    });
    await expect(link).toHaveCSS("color", "rgb(24, 68, 112)");
    await panel.evaluate((element) => {
      element.style.removeProperty("--link-color");
    });
    await expect(link).toHaveCSS("color", "rgb(181, 45, 116)");

    await customMark.hover();
    await expect(customMark).toHaveCSS("color", "rgb(31, 125, 81)");
    expect(
      await customMarkers.evaluateAll((elements) =>
        elements.some(
          (element) =>
            element.style.getPropertyValue("--gd-hc-font-size") === "24px"
        )
      )
    ).toBe(true);

    expect(
      await customMark.evaluate((element) => {
        const text = element.firstChild;
        const index = text?.nodeValue?.indexOf("\u00a0") ?? -1;
        const overlayElement = element.closest(".ProseMirror")?.nextElementSibling;
        const markerElements = overlayElement?.querySelectorAll(
          '[data-character="no-break-space"][data-source-tag="a"]'
        );
        if (!(text instanceof Text) || index < 0 || !markerElements) {
          return false;
        }

        const range = document.createRange();
        range.setStart(text, index);
        range.setEnd(text, index + 1);
        const characterRect = range.getBoundingClientRect();
        return Array.from(markerElements).some((markerElement) => {
          const markerRect = markerElement.getBoundingClientRect();
          return (
            Math.abs(characterRect.left - markerRect.left) < 1 &&
            Math.abs(characterRect.top - markerRect.top) < 1 &&
            Math.abs(characterRect.width - markerRect.width) < 1 &&
            Math.abs(characterRect.height - markerRect.height) < 1
          );
        });
      })
    ).toBe(true);

    await page.mouse.move(0, 0);
    await panel.evaluate((element) => {
      element.setAttribute("data-theme", "dark");
    });
    await expect(link).toHaveCSS("color", "rgb(111, 207, 169)");
    await expect(mark).toHaveCSS("color", "rgb(197, 153, 255)");
    expect(
      await noBreakMarkers.first().evaluate((element) =>
        window
          .getComputedStyle(element, "::before")
          .getPropertyValue("font-palette")
      )
    ).toBe("--gd-hc-dark");

    await link.hover();
    await expect(link).toHaveCSS("color", "rgb(242, 188, 74)");

    await page.mouse.move(0, 0);
    await proseMirror.blur();
    await expect(link).toHaveCSS("color", "rgb(111, 207, 169)");
    await expect(overlay).toHaveCSS("opacity", "0");
  });

  for (const extraFragments of [false, true]) {
    test(`writer aligns marked whitespace${extraFragments ? " with extra WebKit boundary fragments" : " in native ranges"}`, async ({ page }) => {
      await page.goto("/panel/pages/home");
      const proseMirror = page.locator(".k-field-name-writer .ProseMirror");
      await proseMirror.click();
      await proseMirror.evaluate((element, injectFragments) => {
        if (injectFragments) {
          const getClientRects = Range.prototype.getClientRects;
          Range.prototype.getClientRects = function () {
            const rects = Array.from(getClientRects.call(this));
            const rect = rects.find((item) => item.width > 0);
            if (!this.collapsed && rect) {
              // Reproduce Safari's adjacent-run caret fragments in every
              // engine, including a fragment left on the previous line.
              rects.unshift(
                new DOMRect(rect.left - 4, rect.top - 24, 0, rect.height)
              );
              rects.push(
                new DOMRect(rect.right + 4, rect.top + 24, 0, rect.height)
              );
            }
            return Object.assign(rects, {
              item: (index: number) => rects[index],
            });
          };
        }
        element.innerHTML = [
          "<p>Plain&nbsp;text</p>",
          "<p><strong>Bold&nbsp;text</strong></p>",
          "<p><em>Italic&nbsp;text</em></p>",
          "<p><code>Code&nbsp;text</code></p>",
          '<p><strong><a href="#"><em>Nested&nbsp;text</em></a></strong></p>',
          "<p><u>Underlined&nbsp;text</u></p>",
          "<p><s>Struck&nbsp;text</s></p>",
          "<p><sub>Subscript&nbsp;text</sub><sup>Superscript&nbsp;text</sup></p>",
          '<p><a href="#custom">Custom&nbsp;text</a></p>',
          "<p><strong>&nbsp;Leading&nbsp;&nbsp;trailing&nbsp;</strong></p>",
          "<p>Zero\u200bwidth soft\u00adhyphen<br>last</p>",
        ].join("");
      }, extraFragments);
      await page.addStyleTag({ content: `
        .k-field-name-writer a[href="#custom"] {
          font: italic 700 23px Georgia, serif;
        }
      ` });
      const overlay = proseMirror.locator("+ .gd-hidden-characters");
      const markers = overlay.locator('[data-character="no-break-space"]');
      await expect(markers).toHaveCount(14);

      for (const width of [1000, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => proseMirror.evaluate((element) => {
          const overlay = element.nextElementSibling!;
          const markers = Array.from(
            overlay.querySelectorAll('[data-character="no-break-space"]')
          );
          const walker = document.createTreeWalker(
            element, NodeFilter.SHOW_TEXT
          );
          let node: Node | null;
          let index = 0;
          const failures: string[] = [];
          while ((node = walker.nextNode())) {
            const value = node.nodeValue ?? "";
            for (let offset = 0; offset < value.length; offset++) {
              if (value[offset] !== "\u00a0") continue;
              const range = document.createRange();
              range.setStart(node, offset);
              range.setEnd(node, offset + 1);
              // BoundingClientRect is independent of the injected fragments;
              // each NBSP is non-breaking and occupies exactly one line.
              const expected = range.getBoundingClientRect();
              const actual = markers[index++]?.getBoundingClientRect();
              const expectedCenter = expected.left + expected.width / 2;
              const actualCenter = actual ? actual.left + actual.width / 2 : 0;
              if (!actual || actual.width <= 0 ||
                Math.abs(actualCenter - expectedCenter) > 1 ||
                Math.abs(actual.top - expected.top) > 1 ||
                Math.abs(actual.height - expected.height) > 1) {
                failures.push(`${node.parentElement?.localName}:${offset}`);
              }
            }
          }
          return failures;
        })).toEqual([]);
      }
      for (const character of ["zero-width-space", "shy", "break", "paragraph-last"]) {
        await expect(overlay.locator(`[data-character="${character}"]`)).toHaveCount(1);
      }
      await expect(proseMirror.locator(".gd-hidden-character-marker")).toHaveCount(0);
    });
  }

  test("writer overlay covers every supported whitespace character", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await proseMirror.click();
    await proseMirror.evaluate((element) => {
      element.textContent =
        "x \u00a0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u202f\u205f\u00ad\u0009y";
    });

    const overlay = proseMirror.locator("+ .gd-hidden-characters");
    const expected = [
      "space",
      "no-break-space",
      "en-quad",
      "em-quad",
      "en-space",
      "em-space",
      "three-per-em-space",
      "four-per-em-space",
      "six-per-em-space",
      "figure-space",
      "punctuation-space",
      "thin-space",
      "hair-space",
      "zero-width-space",
      "narrow-no-break-space",
      "medium-mathematical-space",
      "shy",
      "tab",
    ];

    for (const character of expected) {
      await expect(
        overlay.locator(
          `.gd-hidden-character-marker[data-character="${character}"]`
        )
      ).toHaveCount(1);
    }
  });

  test("writer marker layer does not alter selection or copied content", async ({
    browserName,
    context,
    page,
  }) => {
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    }
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await proseMirror.click();
    const htmlBefore = await proseMirror.innerHTML();

    const selected = await proseMirror.locator("code").evaluate((element) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return { text: selection?.toString(), rangeText: range.toString() };
    });

    // Firefox normalizes NBSPs in Selection.toString(); the actual range
    // must still contain the original character in every engine.
    expect(selected.text?.replace(/\u00a0/g, " ")).toBe("Code text");
    expect(selected.rangeText).toBe("Code\u00a0text");
    // Playwright's clipboard permissions are Chromium-only. All engines
    // still verify the native selection and untouched editable content.
    if (browserName === "chromium") {
      await page.keyboard.press(
        `${process.platform === "darwin" ? "Meta" : "Control"}+C`
      );
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "Code\u00a0text"
      );
    }
    expect(await proseMirror.innerHTML()).toBe(htmlBefore);
    await expect(proseMirror.locator(".gd-hidden-character-marker")).toHaveCount(0);
  });

  test("writer batches dense spaces and no-break spaces at mark boundaries", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await proseMirror.click();
    await proseMirror.evaluate((element) => {
      const words = Array.from({ length: 401 }, (_, index) => `word${index}`).join(
        " "
      );
      element.innerHTML = `<p><strong>\u00a0Marked\u00a0</strong>${words}\u00a0\u00a0</p>`;
    });

    const overlay = proseMirror.locator("+ .gd-hidden-characters");
    await expect(
      overlay.locator('.gd-hidden-character-marker[data-character="space"]')
    ).toHaveCount(400);
    await expect(
      overlay.locator(
        '.gd-hidden-character-marker[data-character="no-break-space"]'
      )
    ).toHaveCount(4);
    await expect(overlay).toHaveText("");
  });

  // ---------------------------------------------------------------------------
  // Blocks field — writer inside a text block also gets an overlay
  // ---------------------------------------------------------------------------

  test("overlay is injected inside a blocks text field writer", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const blocksProseMirror = page.locator(
      '.k-field-name-blocks .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    await blocksProseMirror.click();

    const overlay = page.locator(
      '.k-field-name-blocks .k-writer-input .ProseMirror[contenteditable="true"] + .gd-hidden-characters'
    );
    await expect(overlay).toBeAttached();
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
  });

  // ---------------------------------------------------------------------------
  // Textarea field (with toolbar)
  // ---------------------------------------------------------------------------

  test("overlay is injected next to the textarea field after focus", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const textarea = page.locator(
      ".k-field-name-textarea .k-textarea-input-native"
    );
    await textarea.click();

    const overlay = page.locator(
      ".k-field-name-textarea .k-textarea-input-native + .gd-hidden-characters"
    );
    await expect(overlay).toBeAttached();
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
  });

  test("textarea overlay bounding box matches the native textarea within 2 px", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const textarea = page.locator(
      ".k-field-name-textarea .k-textarea-input-native"
    );
    await textarea.click();

    const overlay = page.locator(
      ".k-field-name-textarea .k-textarea-input-native + .gd-hidden-characters"
    );
    await expect(overlay).toBeAttached();

    const inputBox = await textarea.boundingBox();
    const overlayBox = await overlay.boundingBox();

    expect(inputBox).not.toBeNull();
    expect(overlayBox).not.toBeNull();

    expect(Math.abs((overlayBox?.x ?? 0) - (inputBox?.x ?? 0))).toBeLessThan(2);
    expect(Math.abs((overlayBox?.y ?? 0) - (inputBox?.y ?? 0))).toBeLessThan(2);
    expect(
      Math.abs((overlayBox?.width ?? 0) - (inputBox?.width ?? 0))
    ).toBeLessThan(2);
    expect(
      Math.abs((overlayBox?.height ?? 0) - (inputBox?.height ?? 0))
    ).toBeLessThan(2);
  });

  // ---------------------------------------------------------------------------
  // Textarea without toolbar — dimensions must still be in sync
  // ---------------------------------------------------------------------------

  test("textarea without toolbar gets overlay and bounding box is in sync", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const textarea = page.locator(
      ".k-field-name-textarea_notoolbar .k-textarea-input-native"
    );
    await textarea.click();

    const overlay = page.locator(
      ".k-field-name-textarea_notoolbar .k-textarea-input-native + .gd-hidden-characters"
    );
    await expect(overlay).toBeAttached();

    const inputBox = await textarea.boundingBox();
    const overlayBox = await overlay.boundingBox();

    expect(inputBox).not.toBeNull();
    expect(overlayBox).not.toBeNull();

    expect(Math.abs((overlayBox?.x ?? 0) - (inputBox?.x ?? 0))).toBeLessThan(2);
    expect(Math.abs((overlayBox?.y ?? 0) - (inputBox?.y ?? 0))).toBeLessThan(2);
    expect(
      Math.abs((overlayBox?.width ?? 0) - (inputBox?.width ?? 0))
    ).toBeLessThan(2);
    expect(
      Math.abs((overlayBox?.height ?? 0) - (inputBox?.height ?? 0))
    ).toBeLessThan(2);
  });

  // ---------------------------------------------------------------------------
  // Textarea scroll sync
  // ---------------------------------------------------------------------------

  test("overlay scroll position stays in sync with textarea scroll", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const textarea = page.locator(
      ".k-field-name-textarea .k-textarea-input-native"
    );
    await textarea.click();

    const overlay = page.locator(
      ".k-field-name-textarea .k-textarea-input-native + .gd-hidden-characters"
    );
    await expect(overlay).toBeAttached();

    // Scroll the native textarea and verify the overlay follows
    const scrollTop = await textarea.evaluate((el: HTMLTextAreaElement) => {
      el.scrollTop = 50;
      el.dispatchEvent(new Event("scroll"));
      return el.scrollTop;
    });

    const overlayScrollTop = await overlay.evaluate(
      (el: HTMLElement) => el.scrollTop
    );

    expect(overlayScrollTop).toBe(scrollTop);
  });
});

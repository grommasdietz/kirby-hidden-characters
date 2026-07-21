import { expect, test } from "@playwright/test";

const PANEL_EMAIL =
  process.env.KIRBY_USER_EMAIL ?? "admin@kirby-hidden-characters.test";
const PANEL_PASSWORD = process.env.KIRBY_USER_PASSWORD ?? "playwright";

test.describe("Panel: hidden-characters rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/panel/login");
    await page.getByLabel("Email").fill(PANEL_EMAIL);
    await page.getByLabel("Password").fill(PANEL_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/panel/);
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

  test("hidden-characters font is applied to the writer field", async ({
    page,
  }) => {
    await page.goto("/panel/pages/home");

    const proseMirror = page.locator(
      '.k-field-name-writer .k-writer-input .ProseMirror[contenteditable="true"]'
    );
    const fontFamily = await proseMirror.evaluate(
      (el) => window.getComputedStyle(el).fontFamily
    );

    expect(fontFamily.toLowerCase()).toContain("hidden-characters");
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

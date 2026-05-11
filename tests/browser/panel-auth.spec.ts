import { expect, test } from "@playwright/test";

const PANEL_EMAIL = process.env.KIRBY_USER_EMAIL ?? "admin@kirby-hidden-characters.test";
const PANEL_PASSWORD = process.env.KIRBY_USER_PASSWORD ?? "playwright";

test.describe("Panel authentication", () => {
  test("admin can log into the Panel", async ({ page }) => {
    await page.goto("/panel/login");

    await page.getByLabel("Email").fill(PANEL_EMAIL);
    await page.getByLabel("Password").fill(PANEL_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/panel/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

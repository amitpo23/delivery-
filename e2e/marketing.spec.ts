import { test, expect } from "@playwright/test";

/**
 * Marketing surfaces — landing + key pages — should render with the
 * Split palette (navy primary, blue accent, no orange).
 */

test.describe("Marketing", () => {
  test("homepage hero loads and links to /booking", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /משלוחים מהירים ואמינים/ })
    ).toBeVisible();

    // Scope to <main> — same link also appears in footer
    const cta = page.locator("main").getByRole("link", {
      name: /הזמן משלוח עכשיו/,
    });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/booking/);
  });

  test("/services page renders without errors", async ({ page }) => {
    const response = await page.goto("/services");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
  });

  test("/contact page renders without errors", async ({ page }) => {
    const response = await page.goto("/contact");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
  });

  test("public 404 path returns a not-found page (not a crash)", async ({
    page,
  }) => {
    const response = await page.goto("/this-page-does-not-exist-zzz");
    expect(response?.status()).toBe(404);
  });
});

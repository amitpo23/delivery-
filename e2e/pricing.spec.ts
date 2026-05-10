import { test, expect } from "@playwright/test";

/**
 * Public price calculator on /pricing.
 *
 * Verifies the live quote panel — Split design — updates as the user
 * types and that the CTA deep-links into /booking with the same
 * addresses.
 */
test.describe("/pricing — calculator", () => {
  test("shows empty state, then updates the quote when both addresses are filled", async ({
    page,
  }) => {
    await page.goto("/pricing");

    // Empty placeholder visible
    await expect(page.getByText("₪—")).toBeVisible();
    await expect(
      page.getByText(/מלאו כתובת איסוף ויעד/)
    ).toBeVisible();

    // Fill both addresses
    const inputs = page.getByPlaceholder("עיר או יישוב");
    await inputs.nth(0).fill("חיפה");
    await inputs.nth(1).fill("עפולה");

    // Empty placeholder gone, CTA appears
    await expect(page.getByText("₪—")).not.toBeVisible();
    await expect(page.getByRole("link", { name: /המשך להזמנה/ })).toBeVisible();
  });

  test("CTA carries the addresses into /booking via query string", async ({
    page,
  }) => {
    await page.goto("/pricing");
    const inputs = page.getByPlaceholder("עיר או יישוב");
    await inputs.nth(0).fill("חיפה");
    await inputs.nth(1).fill("עפולה");

    const cta = page.getByRole("link", { name: /המשך להזמנה/ });
    const href = await cta.getAttribute("href");
    expect(href).toContain("/booking?");
    expect(decodeURIComponent(href!)).toContain("from=חיפה");
    expect(decodeURIComponent(href!)).toContain("to=עפולה");
  });

  test("recomputes when the service tier changes", async ({ page }) => {
    await page.goto("/pricing");
    const inputs = page.getByPlaceholder("עיר או יישוב");
    await inputs.nth(0).fill("חיפה");
    await inputs.nth(1).fill("עפולה");

    // Capture the price element before tier change
    const priceLine = page.locator("text=סה״כ לתשלום").locator("..");
    const before = await priceLine.textContent();

    // Switch to express (highest tier)
    await page.getByRole("button", { name: /אקספרס/ }).click();
    const after = await priceLine.textContent();

    expect(after).not.toBe(before);
  });
});

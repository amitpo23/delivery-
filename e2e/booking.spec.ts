import { test, expect } from "@playwright/test";

/**
 * Booking flow — happy path in demo mode.
 *
 * Demo mode is the default when NEXT_PUBLIC_PAYMENT_LIVE != "true",
 * so the form posts to /api/orders instead of redirecting to Sumit.
 * That lets us assert the in-app confirmation screen without a real
 * card.
 */

test.describe("/booking — Split shell", () => {
  test("renders the navy panel + 3-step stepper at desktop", async ({ page }) => {
    await page.goto("/booking");

    // Brand mark inside navy panel
    await expect(page.getByText("אליהב כהן").first()).toBeVisible();

    // Eyebrow chip with current step
    await expect(page.getByText(/שלב 1 מתוך 3/)).toBeVisible();

    // Stepper carries all 3 steps — scoped to the navy panel, exact match
    const panel = page.locator("aside").first();
    await expect(panel.getByText("כתובות", { exact: true })).toBeVisible();
    await expect(panel.getByText("חבילה", { exact: true })).toBeVisible();
    await expect(panel.getByText("תשלום", { exact: true })).toBeVisible();

    // Coverage badges in the panel
    await expect(panel.getByText("חיפה")).toBeVisible();
    await expect(panel.getByText("עפולה")).toBeVisible();

    // Form headline
    await expect(page.getByRole("heading", { name: /פרטי האיסוף/ })).toBeVisible();

    // Continue button is disabled until fields are filled
    const next = page.getByRole("button", { name: /המשך אל החבילה/ });
    await expect(next).toBeDisabled();
  });

  test("prefills addresses from query string (bot deep-link UX)", async ({ page }) => {
    await page.goto(
      "/booking?from=" +
        encodeURIComponent("חיפה, רחוב הנמל 12") +
        "&to=" +
        encodeURIComponent("עפולה, ויצמן 5") +
        "&size=M&urgency=express"
    );

    const pickup = page.getByPlaceholder("עיר, רחוב, מספר בית").first();
    await expect(pickup).toHaveValue("חיפה, רחוב הנמל 12");

    const delivery = page.getByPlaceholder("עיר, רחוב, מספר בית").nth(1);
    await expect(delivery).toHaveValue("עפולה, ויצמן 5");
  });

  test("can step from 1 → 2 once required fields are filled", async ({ page }) => {
    await page.goto("/booking");

    // Step 1 fields
    const addressInputs = page.getByPlaceholder("עיר, רחוב, מספר בית");
    await addressInputs.nth(0).fill("חיפה, הנמל 12");
    await addressInputs.nth(1).fill("עפולה, ויצמן 5");

    const nameInputs = page.getByPlaceholder("שם מלא");
    await nameInputs.nth(0).fill("אליהב כהן");
    await nameInputs.nth(1).fill("רחל לוי");

    const phoneInputs = page.getByPlaceholder("050-000-0000");
    await phoneInputs.nth(0).fill("0500000000");
    await phoneInputs.nth(1).fill("0500000001");

    const next = page.getByRole("button", { name: /המשך אל החבילה/ });
    await expect(next).toBeEnabled();
    await next.click();

    // Now in step 2 — package details
    await expect(page.getByRole("heading", { name: /פרטי החבילה/ })).toBeVisible();
    await expect(page.getByText(/גודל חבילה/)).toBeVisible();
    await expect(page.getByText(/שלב 2 מתוך 3/)).toBeVisible();
  });
});

test.describe("/booking — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("collapses the navy panel above the form", async ({ page }) => {
    await page.goto("/booking");

    // Both panel + form are visible (stacked, not side-by-side)
    await expect(page.getByText("אליהב כהן").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /פרטי האיסוף/ })).toBeVisible();

    // Action buttons are reachable (not hidden off-screen)
    const next = page.getByRole("button", { name: /המשך אל החבילה/ });
    await expect(next).toBeVisible();
  });
});

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

test.describe("/booking — full happy path (demo mode)", () => {
  test("step 1 → 2 → 3 → submit → confirmation", async ({ page }) => {
    // Stub the order-creation endpoint so the test doesn't need a DB.
    // The demo-mode branch of submit() POSTs here when
    // NEXT_PUBLIC_PAYMENT_LIVE !== "true" (the default in dev/test).
    await page.route("**/api/orders", async (route) => {
      const req = route.request();
      const body = req.postDataJSON();
      // Sanity: the form should send addresses + a card last4 (PCI-safe).
      expect(body.pickupAddress).toContain("חיפה");
      expect(body.deliveryAddress).toContain("עפולה");
      expect(body.card?.last4).toMatch(/^\d{4}$/);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orderNumber: "DEL-TEST-12345",
          ok: true,
        }),
      });
    });

    // Stub the quote so the test is deterministic regardless of zone-floor
    // floats. The form calls this when advancing 2 → 3.
    await page.route("**/api/pricing/quote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          quote: {
            currency: "ILS",
            total: 99,
            subtotal: 84.6,
            vat: 14.4,
            basePrice: 35,
            distanceCost: 25,
            weightFactor: 1,
            zoneFactor: 1.4,
            urgencyFactor: 1,
            fragileSurcharge: 0,
            insuranceFee: 0,
            surge: 1,
            breakdown: {
              pickupZone: "חיפה",
              deliveryZone: "עפולה",
              formula: "test",
            },
          },
          distanceKm: 25,
          distanceSource: "zone-floor",
          subZones: { pickup: null, delivery: null },
          coordinates: null,
        }),
      });
    });

    await page.goto("/booking");

    // ── Step 1 ─────────────────────────────────────────────
    const addresses = page.getByPlaceholder("עיר, רחוב, מספר בית");
    await addresses.nth(0).fill("חיפה, רחוב הנמל 12");
    await addresses.nth(1).fill("עפולה, ויצמן 5");

    const names = page.getByPlaceholder("שם מלא");
    await names.nth(0).fill("אליהב כהן");
    await names.nth(1).fill("רחל לוי");

    const phones = page.getByPlaceholder("050-000-0000");
    await phones.nth(0).fill("0500000000");
    await phones.nth(1).fill("0500000001");

    await page.getByRole("button", { name: /המשך אל החבילה/ }).click();

    // ── Step 2 ─────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /פרטי החבילה/ })
    ).toBeVisible();
    // Defaults pass step2Valid (size=S, category=מסמכים, urgency=next_day).
    await page.getByRole("button", { name: /המשך אל התשלום/ }).click();

    // ── Step 3 ─────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /תשלום ואישור/ })
    ).toBeVisible();
    // Quote panel rendered — שלב 3 הצעת מחיר is מוטמע
    await expect(page.getByText("סה״כ לתשלום")).toBeVisible();

    // Fill card (demo mode — never leaves the form, sent as last4 only).
    // The Field helper renders <label>{text}</label><input> as siblings
    // without htmlFor, so we target by parent div + sequence.
    const cardField = (text: string) =>
      page.locator("div").filter({ hasText: new RegExp(`^${text}.*$`) }).last().locator("input,textarea");

    // Card number is unique by placeholder; the rest by label.
    await page.getByPlaceholder("0000 0000 0000 0000").fill("4580 1234 5678 1234");
    await cardField("שם בעל הכרטיס").first().fill("אליהב כהן");
    await page.getByPlaceholder("12/27").fill("12/27");
    // CVV input: type=password, only one in the form
    await page.locator('input[type="password"]').fill("123");

    // ── Submit ─────────────────────────────────────────────
    await page.getByRole("button", { name: /אישור הזמנה/ }).click();

    // Confirmation screen with mocked order number
    await expect(
      page.getByRole("heading", { name: /ההזמנה אושרה/ })
    ).toBeVisible();
    await expect(page.getByText("DEL-TEST-12345")).toBeVisible();

    // Tracking link points to /track/<orderNumber>
    const trackLink = page.getByRole("link", { name: /מעקב חי/ });
    await expect(trackLink).toBeVisible();
    expect(await trackLink.getAttribute("href")).toBe(
      "/track/DEL-TEST-12345"
    );
  });
});

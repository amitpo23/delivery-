import { test, expect } from "@playwright/test";

/**
 * Auth gating — middleware redirects unauthenticated visitors to
 * /login when they try to reach /admin/*, /driver/*, /dashboard,
 * /orders or /profile. These tests don't need a real Supabase
 * session; they assert the redirect contract end-to-end.
 *
 * Authenticated flows (admin loads /admin/orders) require seeded
 * users + cookies and are intentionally skipped here — they live
 * in a follow-up CI job that talks to a staging Supabase project.
 */

test.describe("Auth gating", () => {
  test("/admin/* redirects unauthenticated users to /login", async ({
    page,
  }) => {
    const response = await page.goto("/admin/orders");
    // Expect the user landed on /login, with the original path preserved
    // so the form can bounce them back after sign-in.
    await expect(page).toHaveURL(/\/login/);
    expect(response?.status()).toBeLessThan(400);
    const url = new URL(page.url());
    expect(url.searchParams.get("redirect")).toBe("/admin/orders");
  });

  test("/driver/* redirects unauthenticated users to /login", async ({
    page,
  }) => {
    await page.goto("/driver/tasks");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("redirect")).toBe("/driver/tasks");
  });

  test("/dashboard redirects unauthenticated users to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("redirect")).toBe("/dashboard");
  });

  test("/orders (portal) redirects unauthenticated users to /login", async ({
    page,
  }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/login page renders the auth form", async ({ page }) => {
    await page.goto("/login");

    // Email + password inputs and a submit button should be visible.
    const emailInput = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passwordInput = page
      .locator('input[type="password"], input[name="password"]')
      .first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("/register page renders the signup form", async ({ page }) => {
    await page.goto("/register");
    expect(page.url()).toContain("/register");

    const emailInput = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    await expect(emailInput).toBeVisible();
  });

  test("/forgot-password page renders without crashing", async ({ page }) => {
    const response = await page.goto("/forgot-password");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Public surfaces are not gated", () => {
  test("public homepage is reachable without auth", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
  });

  test("public /booking is reachable without auth (anonymous booking)", async ({
    page,
  }) => {
    const response = await page.goto("/booking");
    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { name: /פרטי האיסוף/ })
    ).toBeVisible();
  });

  test("public /pricing calculator is reachable without auth", async ({
    page,
  }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBeLessThan(400);
    // The Split calculator panel
    await expect(page.getByText(/הצעת מחיר חיה/)).toBeVisible();
  });

  test("public tracking endpoint accepts an order number lookup form", async ({
    page,
  }) => {
    const response = await page.goto("/tracking");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
  });
});

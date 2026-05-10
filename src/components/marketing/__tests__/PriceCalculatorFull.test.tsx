import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PriceCalculatorFull from "../PriceCalculatorFull";

/**
 * The calculator quotes from constants/services (basePrice + surcharges).
 * Defaults are: serviceType=next_day (35), packageType=small_package (0),
 * weight=light (0). The distance surcharge is deterministic per address pair
 * (sum of char codes mod 50, plus 10) so we can assert real numbers.
 *
 * VAT is 17% of subtotal. Total = subtotal + VAT (rounded).
 */

describe("PriceCalculatorFull", () => {
  it("shows the empty state until both addresses are filled", () => {
    render(<PriceCalculatorFull />);

    // Empty placeholder is shown (₪—)
    expect(screen.getByText(/הצעת מחיר חיה/)).toBeInTheDocument();
    expect(screen.getByText("₪—")).toBeInTheDocument();
    expect(
      screen.getByText(/מלאו כתובת איסוף ויעד לקבלת הצעה/)
    ).toBeInTheDocument();

    // CTA is replaced with a hint, not a link
    expect(
      screen.queryByRole("link", { name: /המשך להזמנה/ })
    ).not.toBeInTheDocument();
  });

  it("computes a live quote when both addresses are present and links to /booking with prefill", () => {
    render(<PriceCalculatorFull />);

    const inputs = screen.getAllByPlaceholderText("עיר או יישוב");
    fireEvent.change(inputs[0], { target: { value: "חיפה" } });
    fireEvent.change(inputs[1], { target: { value: "עפולה" } });

    // Empty placeholder is gone now that both addresses are present
    expect(screen.queryByText("₪—")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/מלאו כתובת איסוף ויעד/)
    ).not.toBeInTheDocument();

    // CTA appears and deep-links into /booking with addresses
    const cta = screen.getByRole("link", { name: /המשך להזמנה/ });
    const href = cta.getAttribute("href");
    expect(href).toContain("/booking?");
    expect(href).toContain("from=");
    expect(href).toContain("to=");
    // URL-encoded Hebrew
    expect(decodeURIComponent(href!)).toContain("from=חיפה");
    expect(decodeURIComponent(href!)).toContain("to=עפולה");
  });

  it("recalculates when service type changes", () => {
    render(<PriceCalculatorFull />);

    fireEvent.change(screen.getAllByPlaceholderText("עיר או יישוב")[0], {
      target: { value: "חיפה" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("עיר או יישוב")[1], {
      target: { value: "עפולה" },
    });

    // Snapshot the price — .text content will change after we click Express
    const priceBefore = screen
      .getAllByText(/₪/)
      .find((el) => el.textContent?.includes("₪") && /\d/.test(el.textContent))
      ?.textContent;
    expect(priceBefore).toBeTruthy();

    // Switch to express (basePrice 79 > next_day 35) — total must rise
    fireEvent.click(screen.getByRole("button", { name: /אקספרס/ }));
    const priceAfter = screen
      .getAllByText(/₪/)
      .find((el) => el.textContent?.includes("₪") && /\d/.test(el.textContent))
      ?.textContent;
    expect(priceAfter).toBeTruthy();
    expect(priceAfter).not.toBe(priceBefore);
  });

  it("produces the same quote for identical input pairs (deterministic, no Math.random)", () => {
    const { unmount } = render(<PriceCalculatorFull />);
    fireEvent.change(screen.getAllByPlaceholderText("עיר או יישוב")[0], {
      target: { value: "חיפה" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("עיר או יישוב")[1], {
      target: { value: "עפולה" },
    });
    const firstHref = screen
      .getByRole("link", { name: /המשך להזמנה/ })
      .getAttribute("href");
    const firstPrice = screen.getByText("סה״כ לתשלום (כולל מע״מ)")
      .nextElementSibling?.textContent;
    unmount();

    // Re-mount with the same inputs — must yield the same numbers
    render(<PriceCalculatorFull />);
    fireEvent.change(screen.getAllByPlaceholderText("עיר או יישוב")[0], {
      target: { value: "חיפה" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("עיר או יישוב")[1], {
      target: { value: "עפולה" },
    });
    const secondHref = screen
      .getByRole("link", { name: /המשך להזמנה/ })
      .getAttribute("href");
    const secondPrice = screen.getByText("סה״כ לתשלום (כולל מע״מ)")
      .nextElementSibling?.textContent;

    expect(secondPrice).toBe(firstPrice);
    expect(secondHref).toBe(firstHref);
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplitShell, type SplitStep } from "../split-shell";

const STEPS: SplitStep[] = [
  { num: 1, name: "כתובות", est: "~3 דק׳" },
  { num: 2, name: "חבילה", est: "2 דק׳" },
  { num: 3, name: "תשלום", est: "1 דק׳" },
];

describe("SplitShell", () => {
  it("renders the brand, eyebrow, title, lede, and form children", () => {
    render(
      <SplitShell
        step={1}
        steps={STEPS}
        panelEyebrow="שלב 1 מתוך 3"
        panelTitle={<span>בואו נסדר</span>}
        panelLede="טקסט הסבר"
      >
        <div data-testid="form-content">תוכן הטופס</div>
      </SplitShell>
    );

    expect(screen.getByText("אליהב כהן")).toBeInTheDocument();
    expect(screen.getByText("פודגרופ ומשלוחים")).toBeInTheDocument();
    expect(screen.getByText("שלב 1 מתוך 3")).toBeInTheDocument();
    expect(screen.getByText("בואו נסדר")).toBeInTheDocument();
    expect(screen.getByText("טקסט הסבר")).toBeInTheDocument();
    expect(screen.getByTestId("form-content")).toBeInTheDocument();
  });

  it("renders all steps and marks the right one as active", () => {
    render(
      <SplitShell
        step={2}
        steps={STEPS}
        panelTitle="t"
      >
        <div />
      </SplitShell>
    );

    // Each step name is rendered
    expect(screen.getByText("כתובות")).toBeInTheDocument();
    expect(screen.getByText("חבילה")).toBeInTheDocument();
    expect(screen.getByText("תשלום")).toBeInTheDocument();

    // Done step (1) is rendered with the checkmark instead of the number
    // Active step (2) shows "2"; pending (3) shows "3"
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows custom trust badges when provided", () => {
    const { ShieldCheck } = require("lucide-react");
    render(
      <SplitShell
        step={1}
        steps={STEPS}
        panelTitle="t"
        panelTrust={[
          { icon: ShieldCheck, text: "GDPR-safe" },
          { icon: ShieldCheck, text: "SOC2" },
        ]}
      >
        <div />
      </SplitShell>
    );

    expect(screen.getByText("GDPR-safe")).toBeInTheDocument();
    expect(screen.getByText("SOC2")).toBeInTheDocument();
  });

  it("renders the topRight slot at the form-pane top", () => {
    render(
      <SplitShell
        step={1}
        steps={STEPS}
        panelTitle="t"
        topRight={<span>צריכים עזרה?</span>}
      >
        <div />
      </SplitShell>
    );

    expect(screen.getByText("צריכים עזרה?")).toBeInTheDocument();
  });
});

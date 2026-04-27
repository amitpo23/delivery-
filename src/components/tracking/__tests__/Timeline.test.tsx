import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline, type TimelineEvent } from "../Timeline";

const t = "2026-04-27T10:00:00Z";

describe("Timeline", () => {
  it("renders the in-progress flow with the active step highlighted", () => {
    const events: TimelineEvent[] = [
      { status: "pending", notes: null, created_at: t },
      { status: "assigned", notes: null, created_at: t },
    ];
    render(<Timeline current="assigned" events={events} />);
    expect(screen.getByText("שובץ שליח")).toBeInTheDocument();
    expect(screen.getByText("ממתין לאישור")).toBeInTheDocument();
    expect(screen.queryByText("בוטל")).not.toBeInTheDocument();
  });

  it("shows a cancelled banner above the flow when current is cancelled", () => {
    const events: TimelineEvent[] = [
      { status: "pending", notes: null, created_at: t },
      { status: "assigned", notes: null, created_at: t },
      { status: "cancelled", notes: "הלקוח ביטל", created_at: t },
    ];
    render(<Timeline current="cancelled" events={events} />);
    const banners = screen.getAllByText("בוטל");
    // banner + the cancelled label might also appear in ORDER_STATUS_LABELS lookup
    expect(banners.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/הלקוח ביטל/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a returned banner when current is returned", () => {
    const events: TimelineEvent[] = [
      { status: "pending", notes: null, created_at: t },
      { status: "delivered", notes: null, created_at: t },
      { status: "returned", notes: "כתובת שגויה", created_at: t },
    ];
    render(<Timeline current="returned" events={events} />);
    expect(screen.getByText("הוחזר")).toBeInTheDocument();
    expect(screen.getByText(/כתובת שגויה/)).toBeInTheDocument();
  });

  it("does not crash when terminal state has no matching event in history", () => {
    const events: TimelineEvent[] = [
      { status: "pending", notes: null, created_at: t },
    ];
    render(<Timeline current="cancelled" events={events} />);
    expect(screen.getByText("בוטל")).toBeInTheDocument();
  });

  it("falls back to pending as reference when terminal arrives with no flow events", () => {
    render(<Timeline current="cancelled" events={[]} />);
    // pending should be marked reached (fallback), all later steps grey
    expect(screen.getByText("ממתין לאישור")).toBeInTheDocument();
    expect(screen.getByText("בוטל")).toBeInTheDocument();
  });
});

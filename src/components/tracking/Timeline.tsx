import { CheckCircle2, Circle, Clock, XCircle, RotateCcw } from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";

const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
];

const TERMINAL_STATUSES = ["cancelled", "returned"] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

function isTerminal(s: OrderStatus): s is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(s);
}

export interface TimelineEvent {
  status: string;
  notes?: string | null;
  created_at: string;
}

export function Timeline({
  current,
  events,
}: {
  current: OrderStatus;
  events: TimelineEvent[];
}) {
  const terminal = isTerminal(current);

  // For terminal states, the last successful flow step is the latest event
  // whose status sits in ORDER_FLOW. Falls back to "pending" if none found.
  const referenceStatus: OrderStatus = terminal
    ? events
        .map((e) => e.status)
        .filter((s): s is OrderStatus =>
          (ORDER_FLOW as readonly string[]).includes(s)
        )
        .reduce<OrderStatus>(
          (best, s) =>
            ORDER_FLOW.indexOf(s) > ORDER_FLOW.indexOf(best) ? s : best,
          "pending"
        )
    : current;

  const reachedIdx = ORDER_FLOW.indexOf(referenceStatus);
  const eventByStatus = new Map<string, TimelineEvent>();
  for (const e of events) eventByStatus.set(e.status, e);
  const terminalEvent = terminal ? eventByStatus.get(current) : undefined;

  return (
    <div className="space-y-4">
      {terminal && (
        <div
          className={`rounded-xl p-4 border-2 flex items-start gap-3 ${
            current === "cancelled"
              ? "bg-red-50 border-red-200 text-red-900"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
          role="status"
        >
          {current === "cancelled" ? (
            <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
          ) : (
            <RotateCcw className="w-6 h-6 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-bold">{ORDER_STATUS_LABELS[current]}</div>
            {terminalEvent && (
              <div className="text-sm opacity-80 mt-0.5">
                {new Date(terminalEvent.created_at).toLocaleString("he-IL")}
                {terminalEvent.notes ? ` · ${terminalEvent.notes}` : ""}
              </div>
            )}
          </div>
        </div>
      )}

      <ol className="relative space-y-5">
        {ORDER_FLOW.map((status, idx) => {
          const reached = idx <= reachedIdx;
          const isCurrent = !terminal && idx === reachedIdx;
          const event = eventByStatus.get(status);
          return (
            <li key={status} className="flex gap-3 items-start">
              <div className="shrink-0 mt-0.5">
                {reached ? (
                  isCurrent ? (
                    <Clock className="w-5 h-5 text-secondary" />
                  ) : (
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        terminal ? "text-gray-400" : "text-accent"
                      }`}
                    />
                  )
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`font-medium ${
                    isCurrent
                      ? "text-secondary"
                      : reached
                      ? terminal
                        ? "text-gray-500"
                        : "text-primary"
                      : "text-gray-400"
                  }`}
                >
                  {ORDER_STATUS_LABELS[status]}
                </div>
                {event && (
                  <div className="text-xs text-muted mt-0.5">
                    {new Date(event.created_at).toLocaleString("he-IL")}
                    {event.notes ? ` · ${event.notes}` : ""}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

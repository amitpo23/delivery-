import { CheckCircle2, Circle, Clock } from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";

const ORDER_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
];

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
  const reachedIdx = ORDER_FLOW.indexOf(current);
  const eventByStatus = new Map<string, TimelineEvent>();
  for (const e of events) eventByStatus.set(e.status, e);

  return (
    <ol className="relative space-y-5">
      {ORDER_FLOW.map((status, idx) => {
        const reached = idx <= reachedIdx;
        const isCurrent = idx === reachedIdx;
        const event = eventByStatus.get(status);
        return (
          <li key={status} className="flex gap-3 items-start">
            <div className="shrink-0 mt-0.5">
              {reached ? (
                isCurrent ? (
                  <Clock className="w-5 h-5 text-secondary" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                )
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div className="flex-1">
              <div
                className={`font-medium ${
                  isCurrent ? "text-secondary" : reached ? "text-primary" : "text-gray-400"
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
  );
}

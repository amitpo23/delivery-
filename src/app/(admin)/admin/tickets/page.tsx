"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft, Plus, Filter } from "lucide-react";

interface TicketRow {
  id: string;
  ticket_number: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  source: string;
  subject: string;
  customer_phone: string | null;
  order_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  order: { order_number: string; status: string } | { order_number: string; status: string }[] | null;
  assignee: { full_name: string } | { full_name: string }[] | null;
}

const STATUS_LABELS = {
  open: "פתוח",
  in_progress: "בטיפול",
  resolved: "נפתר",
  closed: "סגור",
} as const;

const STATUS_COLORS = {
  open: "#F59E0B",
  in_progress: "#3B82F6",
  resolved: "#10B981",
  closed: "#6B7280",
} as const;

const PRIORITY_LABELS = {
  low: "נמוך",
  normal: "רגיל",
  high: "גבוה",
  urgent: "דחוף",
} as const;

const PRIORITY_COLORS = {
  low: "#9CA3AF",
  normal: "#3B82F6",
  high: "#F97316",
  urgent: "#DC2626",
} as const;

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/tickets"
          : `/api/admin/tickets?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setTickets(json.tickets ?? []);
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    urgent: tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length,
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">פניות / Tickets</h1>
          <p className="text-muted text-sm">
            {tickets.length} פניות בתצוגה | {stats.open} פתוחות | {stats.urgent} דחופות
          </p>
        </div>
      </div>

      <div className="card !p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted" />
          {(["open", "in_progress", "resolved", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                statusFilter === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {s === "all" ? "הכל" : STATUS_LABELS[s as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="text-right p-4 font-medium text-muted">מספר</th>
                <th className="text-right p-4 font-medium text-muted">נושא</th>
                <th className="text-right p-4 font-medium text-muted">הזמנה</th>
                <th className="text-right p-4 font-medium text-muted">סטטוס</th>
                <th className="text-right p-4 font-medium text-muted">דחיפות</th>
                <th className="text-right p-4 font-medium text-muted">מקור</th>
                <th className="text-right p-4 font-medium text-muted">משויך ל</th>
                <th className="text-right p-4 font-medium text-muted">עודכן</th>
                <th className="text-right p-4 font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const order = Array.isArray(t.order) ? t.order[0] : t.order;
                const assignee = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs font-bold" dir="ltr">
                      {t.ticket_number}
                    </td>
                    <td className="p-4 max-w-md">
                      <div className="font-medium truncate">{t.subject}</div>
                      {t.customer_phone && (
                        <div className="text-xs text-muted" dir="ltr">{t.customer_phone}</div>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      {order ? (
                        <Link
                          href={`/track/${order.order_number}`}
                          className="font-mono text-secondary hover:text-secondary-dark"
                          dir="ltr"
                        >
                          #{order.order_number}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: `${STATUS_COLORS[t.status]}15`,
                          color: STATUS_COLORS[t.status],
                        }}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: `${PRIORITY_COLORS[t.priority]}15`,
                          color: PRIORITY_COLORS[t.priority],
                        }}
                      >
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted">
                      {t.source.startsWith("auto_") ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">אוטומטי</span>
                      ) : (
                        "ידני"
                      )}
                    </td>
                    <td className="p-4 text-xs">{assignee?.full_name ?? "—"}</td>
                    <td className="p-4 text-xs text-muted" dir="ltr">
                      {new Date(t.updated_at).toLocaleString("he-IL")}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="flex items-center gap-1 text-secondary hover:text-secondary-dark"
                      >
                        פתח
                        <ChevronLeft className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && tickets.length === 0 && (
          <div className="text-center py-12 text-muted">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין פניות בקטגוריה זו</p>
          </div>
        )}
        {loading && <div className="text-center py-12 text-muted">טוען...</div>}
      </div>

      <div className="mt-4 text-xs text-muted">
        💡 פניות אוטומטיות נוצרות לכל הזמנה שתקועה ב-pending מעל 24 שעות (עוברת cron כל שעה).
      </div>
    </div>
  );
}

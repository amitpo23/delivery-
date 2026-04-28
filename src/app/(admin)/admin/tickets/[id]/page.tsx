"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowRight, Send, Save } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  source: string;
  subject: string;
  description: string | null;
  customer_phone: string | null;
  order_id: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  order: { order_number: string; status: string; pickup_address: string; delivery_address: string } | { order_number: string; status: string; pickup_address: string; delivery_address: string }[] | null;
  assignee: { full_name: string } | { full_name: string }[] | null;
  creator: { full_name: string } | { full_name: string }[] | null;
}

interface Comment {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author: { full_name: string } | { full_name: string }[] | null;
}

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const STATUS_LABELS = {
  open: "פתוח",
  in_progress: "בטיפול",
  resolved: "נפתר",
  closed: "סגור",
} as const;

const PRIORITY_LABELS = {
  low: "נמוך",
  normal: "רגיל",
  high: "גבוה",
  urgent: "דחוף",
} as const;

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draftStatus, setDraftStatus] = useState<Ticket["status"]>("open");
  const [draftPriority, setDraftPriority] = useState<Ticket["priority"]>("normal");
  const [draftResolution, setDraftResolution] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const [commentBody, setCommentBody] = useState("");
  const [commentInternal, setCommentInternal] = useState(true);
  const [postingComment, setPostingComment] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setTicket(json.ticket);
      setComments(json.comments ?? []);
      setDraftStatus(json.ticket.status);
      setDraftPriority(json.ticket.priority);
      setDraftResolution(json.ticket.resolution ?? "");
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveMeta() {
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: draftStatus,
          priority: draftPriority,
          resolution: draftResolution || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "שמירה נכשלה");
        return;
      }
      await fetchData();
    } finally {
      setSavingMeta(false);
    }
  }

  async function postComment() {
    if (!commentBody.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody, isInternal: commentInternal }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "הוספת תגובה נכשלה");
        return;
      }
      setCommentBody("");
      await fetchData();
    } finally {
      setPostingComment(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;
  if (!ticket) return <div className="text-center py-20 text-red-600">{error || "לא נמצא"}</div>;

  const order = Array.isArray(ticket.order) ? ticket.order[0] : ticket.order;
  const creator = Array.isArray(ticket.creator) ? ticket.creator[0] : ticket.creator;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/tickets" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">{ticket.subject}</h1>
            {ticket.source.startsWith("auto_") && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                אוטומטי
              </span>
            )}
          </div>
          <div className="text-xs text-muted" dir="ltr">
            #{ticket.ticket_number} · נפתח {new Date(ticket.created_at).toLocaleString("he-IL")}
            {creator && ` · ${creator.full_name}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 space-y-4">
          {ticket.description && (
            <div className="card !p-4">
              <h2 className="text-sm font-bold text-primary mb-2">תיאור</h2>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {order && (
            <div className="card !p-4">
              <h2 className="text-sm font-bold text-primary mb-2">הזמנה משויכת</h2>
              <div className="text-xs space-y-1">
                <div>
                  מספר:{" "}
                  <Link
                    href={`/track/${order.order_number}`}
                    className="font-mono text-secondary hover:text-secondary-dark"
                    dir="ltr"
                  >
                    #{order.order_number}
                  </Link>
                </div>
                <div>סטטוס: {order.status}</div>
                <div>איסוף: {order.pickup_address}</div>
                <div>מסירה: {order.delivery_address}</div>
              </div>
            </div>
          )}

          <div className="card !p-4">
            <h2 className="text-sm font-bold text-primary mb-3">תגובות ({comments.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {comments.length === 0 ? (
                <div className="text-center py-4 text-muted text-sm">אין תגובות עדיין</div>
              ) : (
                comments.map((c) => {
                  const author = Array.isArray(c.author) ? c.author[0] : c.author;
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg ${
                        c.is_internal ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-xs text-muted">
                        <span className="font-medium">
                          {author?.full_name ?? "—"}
                          {c.is_internal && (
                            <span className="ms-2 text-yellow-700">(הערה פנימית)</span>
                          )}
                        </span>
                        <span>{new Date(c.created_at).toLocaleString("he-IL")}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={3}
                className="input-field resize-none text-sm"
                placeholder="הוסף תגובה..."
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={commentInternal}
                    onChange={(e) => setCommentInternal(e.target.checked)}
                    className="rounded"
                  />
                  הערה פנימית (לא נשלחת ללקוח)
                </label>
                <button
                  onClick={postComment}
                  disabled={postingComment || !commentBody.trim()}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {postingComment ? "שומר..." : "פרסם"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card !p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-primary mb-2">סטטוס</h2>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setDraftStatus(s)}
                  className={`py-1.5 text-xs rounded-lg ${
                    draftStatus === s
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-primary mb-2">דחיפות</h2>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setDraftPriority(p)}
                  className={`py-1.5 text-xs rounded-lg ${
                    draftPriority === p
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {(draftStatus === "resolved" || draftStatus === "closed") && (
            <div>
              <h2 className="text-sm font-bold text-primary mb-2">סיכום פתרון</h2>
              <textarea
                value={draftResolution}
                onChange={(e) => setDraftResolution(e.target.value)}
                rows={3}
                className="input-field resize-none text-sm"
                placeholder="מה הפתרון?"
              />
            </div>
          )}

          <button
            onClick={saveMeta}
            disabled={savingMeta}
            className="btn-primary w-full text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingMeta ? "שומר..." : "שמור שינויים"}
          </button>

          {ticket.customer_phone && (
            <div className="text-xs text-muted pt-2 border-t border-border">
              <div className="font-medium mb-1">לקוח:</div>
              <div dir="ltr">{ticket.customer_phone}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

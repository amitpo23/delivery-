"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, MessageSquare } from "lucide-react";

interface ChatMessage {
  id: string;
  sender_role: "customer" | "driver" | "admin";
  sender_name: string | null;
  body: string;
  read_by_recipient: boolean;
  created_at: string;
}

const ROLE_LABELS = {
  customer: "לקוח",
  driver: "נהג",
  admin: "מוקד",
} as const;

/**
 * Per-order chat surface. Polls /api/chat/<order> every 5s while open
 * (no realtime channel — keeps the dependency surface minimal).
 *
 * `phone` is required for the anonymous-customer path on /track. When
 * the caller is authenticated (driver / admin / portal customer), it
 * can be omitted.
 */
export default function ChatPanel({
  orderNumber,
  phone,
  enabled = true,
}: {
  orderNumber: string;
  phone?: string;
  enabled?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const url = phone
        ? `/api/chat/${orderNumber}?phone=${encodeURIComponent(phone)}`
        : `/api/chat/${orderNumber}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "שגיאה בטעינת השיחה");
        return;
      }
      const json = await res.json();
      setMessages(json.messages ?? []);
      setError(null);
    } catch {
      // Silent — next poll will retry.
    }
  }, [orderNumber, phone]);

  useEffect(() => {
    if (!enabled) return;
    fetchMessages();
    const id = setInterval(fetchMessages, 5_000);
    return () => clearInterval(id);
  }, [enabled, fetchMessages]);

  // Auto-scroll the message list to the bottom whenever new ones arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/${orderNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, phone }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "שליחה נכשלה");
        return;
      }
      setBody("");
      await fetchMessages();
    } finally {
      setBusy(false);
    }
  }

  if (!enabled && phone === undefined) {
    // Anonymous tracker without a phone yet — just show a hint.
    return (
      <div className="text-xs text-muted">צ&apos;אט יהיה זמין לאחר הזנת טלפון</div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-secondary" />
        שיחה עם הנהג / המוקד
      </h3>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
          {error}
        </div>
      )}

      <div
        ref={scrollRef}
        className="space-y-2 max-h-72 overflow-y-auto bg-gray-50 rounded-lg p-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-4 text-muted text-xs">אין הודעות עדיין</div>
        ) : (
          messages.map((m) => {
            const mine = false; // role detection lives server-side; we render plainly
            return (
              <div
                key={m.id}
                className={`flex ${m.sender_role === "customer" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    m.sender_role === "customer"
                      ? "bg-white border border-border"
                      : m.sender_role === "driver"
                        ? "bg-blue-100 text-blue-900"
                        : "bg-amber-100 text-amber-900"
                  } ${mine ? "" : ""}`}
                >
                  <div className="text-[10px] text-muted mb-0.5">
                    {ROLE_LABELS[m.sender_role]}
                    {m.sender_name && ` · ${m.sender_name}`}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className="text-[10px] text-muted mt-0.5" dir="ltr">
                    {new Date(m.created_at).toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="הקלד הודעה..."
          maxLength={2000}
          className="input-field !py-2 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="btn-primary !py-2 px-3 text-sm disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

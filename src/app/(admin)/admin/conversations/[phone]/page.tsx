"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowRight, Send, Bell, MessageSquare, Bot } from "lucide-react";

interface Entry {
  kind: "outgoing-auto" | "outgoing-manual" | "bot-state";
  channel: string;
  status: string | null;
  body: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone: rawPhone } = use(params);
  const phone = decodeURIComponent(rawPhone);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendChannel, setSendChannel] = useState<"whatsapp" | "telegram">("whatsapp");
  const [sendBody, setSendBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conversations/${encodeURIComponent(phone)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setEntries(json.entries ?? []);
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function sendMessage() {
    if (!sendBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: phone,
          channel: sendChannel,
          body: sendBody,
        }),
      });
      if (res.ok || res.status === 502) {
        setShowSendModal(false);
        setSendBody("");
        await fetchData();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "שליחה נכשלה");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/customers" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-primary">היסטוריית שיחה</h1>
          <div className="text-sm text-muted" dir="ltr">
            {phone}
          </div>
        </div>
        <button onClick={() => setShowSendModal(true)} className="btn-primary text-sm">
          <Send className="w-4 h-4" />
          שלח הודעה
        </button>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="card !p-4">
        {loading ? (
          <div className="text-center py-8 text-muted">טוען...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>אין הודעות לטלפון זה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e, idx) => {
              const Icon =
                e.kind === "outgoing-auto"
                  ? Bell
                  : e.kind === "outgoing-manual"
                    ? Send
                    : Bot;
              const palette =
                e.kind === "outgoing-auto"
                  ? "bg-blue-50 border-blue-200"
                  : e.kind === "outgoing-manual"
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200";
              const label =
                e.kind === "outgoing-auto"
                  ? "התראה אוטומטית"
                  : e.kind === "outgoing-manual"
                    ? "הודעה ידנית מ-admin"
                    : "מצב בוט";
              return (
                <div key={idx} className={`p-3 rounded-lg border ${palette}`}>
                  <div className="flex items-center justify-between mb-1 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{label}</span>
                      <span>·</span>
                      <span>{e.channel}</span>
                      {e.status && (
                        <>
                          <span>·</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              e.status === "sent"
                                ? "bg-green-100 text-green-700"
                                : e.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {e.status}
                          </span>
                        </>
                      )}
                    </div>
                    <span dir="ltr">{new Date(e.timestamp).toLocaleString("he-IL")}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{e.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSendModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-primary mb-4">שלח הודעה</h2>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSendChannel("whatsapp")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  sendChannel === "whatsapp" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setSendChannel("telegram")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  sendChannel === "telegram" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                Telegram
              </button>
            </div>
            <textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              rows={5}
              className="input-field resize-none text-sm mb-3"
              placeholder="כתוב את ההודעה..."
            />
            <div className="flex gap-2">
              <button
                onClick={sendMessage}
                disabled={sending || !sendBody.trim()}
                className="btn-primary flex-1 text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? "שולח..." : "שלח"}
              </button>
              <button
                onClick={() => setShowSendModal(false)}
                disabled={sending}
                className="btn-secondary text-sm"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

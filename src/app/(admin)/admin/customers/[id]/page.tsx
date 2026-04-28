"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowRight, Save, Send, X, MessageSquare } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/types";
import type { OrderStatus } from "@/types";

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  service_type: string;
  pickup_address: string;
  delivery_address: string;
  estimated_price: number;
  final_price: number | null;
  created_at: string;
  delivered_at: string | null;
}

interface Customer {
  id: string;
  is_guest: boolean;
  full_name: string;
  phone: string;
  notes: string | null;
  tags: string[];
  customer_type: string;
  company_name: string | null;
}

interface ManualMessage {
  id: string;
  channel: "whatsapp" | "telegram";
  body: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [messages, setMessages] = useState<ManualMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notesDraft, setNotesDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendChannel, setSendChannel] = useState<"whatsapp" | "telegram">("whatsapp");
  const [sendBody, setSendBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "טעינה נכשלה");
        return;
      }
      const json = await res.json();
      setCustomer(json.customer);
      setOrders(json.orders ?? []);
      setMessages(json.messages ?? []);
      setNotesDraft(json.customer.notes ?? "");
      setTagsDraft(json.customer.tags ?? []);
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
    if (!customer || customer.is_guest) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft, tags: tagsDraft }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "שמירה נכשלה");
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSavingMeta(false);
    }
  }

  function addTag() {
    const t = newTag.trim();
    if (!t || tagsDraft.includes(t)) return;
    setTagsDraft([...tagsDraft, t]);
    setNewTag("");
  }

  function removeTag(t: string) {
    setTagsDraft(tagsDraft.filter((x) => x !== t));
  }

  async function sendMessage() {
    if (!customer || !sendBody.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.is_guest ? undefined : customer.id,
          recipient: customer.phone,
          channel: sendChannel,
          body: sendBody,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSendError(j.failureReason || j.error || "שליחה נכשלה");
        await fetchData();
        return;
      }
      setShowSendModal(false);
      setSendBody("");
      await fetchData();
    } catch {
      setSendError("שגיאת רשת");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-muted">טוען...</div>;
  if (error && !customer) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!customer) return null;

  const totalSpent = orders.reduce(
    (sum, o) => sum + Number(o.final_price ?? o.estimated_price ?? 0),
    0,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/customers"
          className="p-2 hover:bg-gray-100 rounded-lg"
          aria-label="חזרה"
        >
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">{customer.full_name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span dir="ltr">{customer.phone}</span>
            {customer.is_guest && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                אורח (לא רשום)
              </span>
            )}
            {customer.company_name && <span>| {customer.company_name}</span>}
          </div>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="btn-primary text-sm"
        >
          <Send className="w-4 h-4" />
          שלח הודעה
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card !p-3 text-center">
          <div className="text-xl font-bold text-primary">{orders.length}</div>
          <div className="text-xs text-muted">הזמנות</div>
        </div>
        <div className="card !p-3 text-center">
          <div className="text-xl font-bold text-primary">
            {orders.filter((o) => o.status === "delivered").length}
          </div>
          <div className="text-xs text-muted">נמסרו</div>
        </div>
        <div className="card !p-3 text-center">
          <div className="text-xl font-bold text-primary">
            {Math.round(totalSpent).toLocaleString()}₪
          </div>
          <div className="text-xs text-muted">סה&quot;כ הוציא</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 card !p-4">
          <h2 className="text-sm font-bold text-primary mb-3">היסטוריית הזמנות</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-6 text-muted text-sm">אין הזמנות</div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-xs text-primary" dir="ltr">
                      #{o.order_number}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {o.pickup_address} → {o.delivery_address}
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: `${ORDER_STATUS_COLORS[o.status]}15`,
                      color: ORDER_STATUS_COLORS[o.status],
                    }}
                  >
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                  <div className="text-sm font-bold whitespace-nowrap">
                    {o.estimated_price}₪
                  </div>
                  <Link
                    href={`/track/${o.order_number}`}
                    className="text-xs text-secondary hover:text-secondary-dark whitespace-nowrap"
                  >
                    מעקב
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card !p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-primary mb-2">תגיות</h2>
            {customer.is_guest ? (
              <div className="text-xs text-muted">תגיות לא זמינות לאורחים</div>
            ) : (
              <>
                <div className="flex gap-1 flex-wrap mb-2">
                  {tagsDraft.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded inline-flex items-center gap-1"
                    >
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="הוסף תגית"
                    className="input-field !py-1 text-xs flex-1"
                  />
                  <button onClick={addTag} className="btn-secondary !py-1 text-xs">
                    הוסף
                  </button>
                </div>
              </>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-primary mb-2">הערות</h2>
            {customer.is_guest ? (
              <div className="text-xs text-muted">הערות לא זמינות לאורחים</div>
            ) : (
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                className="input-field resize-none text-sm"
                placeholder="הערות אישיות..."
              />
            )}
          </div>

          {!customer.is_guest && (
            <button
              onClick={saveMeta}
              disabled={savingMeta}
              className="btn-primary w-full text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingMeta ? "שומר..." : savedFlash ? "נשמר!" : "שמור"}
            </button>
          )}
        </div>
      </div>

      <div className="card !p-4">
        <h2 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-secondary" />
          היסטוריית הודעות
        </h2>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-4 text-muted text-sm">לא נשלחו הודעות עדיין</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.channel === "whatsapp" ? "WhatsApp" : "Telegram"}</span>
                    <span>·</span>
                    <span>{new Date(m.created_at).toLocaleString("he-IL")}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      m.status === "sent"
                        ? "bg-green-100 text-green-700"
                        : m.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSendModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-primary mb-4">שלח הודעה ל{customer.full_name}</h2>

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

            {sendError && (
              <div className="p-2 mb-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {sendError}
              </div>
            )}

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

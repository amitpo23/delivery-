"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Filter } from "lucide-react";

interface AuditEntry {
  id: number;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "order.assign": "שיבוץ הזמנה",
  "customer.update": "עדכון לקוח",
  "ticket.update": "עדכון פנייה",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit");
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
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const allActions = Array.from(new Set(entries.map((e) => e.action))).sort();
  const filtered = actionFilter === "all" ? entries : entries.filter((e) => e.action === actionFilter);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-secondary" />
        <h1 className="text-2xl font-bold text-primary">יומן פעולות</h1>
      </div>

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="card !p-3 mb-4 flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted" />
        <button
          onClick={() => setActionFilter("all")}
          className={`px-3 py-1.5 text-xs rounded-lg ${
            actionFilter === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          הכל ({entries.length})
        </button>
        {allActions.map((a) => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            className={`px-3 py-1.5 text-xs rounded-lg ${
              actionFilter === a ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {ACTION_LABELS[a] ?? a}
          </button>
        ))}
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-muted">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            אין רשומות
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((e) => (
              <div key={e.id} className="p-4">
                <div className="flex items-center justify-between mb-1 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary">
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                    <span>·</span>
                    <span>{e.target_type}</span>
                    {e.target_id && (
                      <>
                        <span>·</span>
                        <span className="font-mono" dir="ltr">{e.target_id.slice(0, 8)}</span>
                      </>
                    )}
                  </div>
                  <span dir="ltr">{new Date(e.created_at).toLocaleString("he-IL")}</span>
                </div>
                <div className="text-sm text-muted mb-2" dir="ltr">
                  {e.actor_email ?? "—"}
                  {e.actor_role && ` (${e.actor_role})`}
                  {e.ip && ` · ${e.ip}`}
                </div>
                {(e.before || e.after) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {e.before && (
                      <div className="p-2 bg-red-50 rounded border border-red-200">
                        <div className="text-red-700 font-medium mb-1">לפני</div>
                        <pre className="whitespace-pre-wrap break-all text-red-900">
                          {JSON.stringify(e.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {e.after && (
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <div className="text-green-700 font-medium mb-1">אחרי</div>
                        <pre className="whitespace-pre-wrap break-all text-green-900">
                          {JSON.stringify(e.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

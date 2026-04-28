"use client";

import { useEffect, useState, useCallback } from "react";
import { Upload, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

interface DocRow {
  id: string;
  doc_type: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  uploaded_at: string;
}

const DOC_TYPES = [
  { value: "license", label: "רישיון נהיגה" },
  { value: "vehicle_registration", label: "רישיון רכב" },
  { value: "insurance", label: "תעודת ביטוח" },
  { value: "id_card", label: "תעודת זהות" },
] as const;

const STATUS_CONFIG = {
  pending: { icon: Clock, label: "ממתין לאישור", color: "#F59E0B" },
  approved: { icon: CheckCircle2, label: "מאושר", color: "#10B981" },
  rejected: { icon: XCircle, label: "נדחה", color: "#DC2626" },
} as const;

export default function DriverOnboardingPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/driver/documents");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "טעינה נכשלה");
      return;
    }
    const json = await res.json();
    setDocs(json.documents ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function upload(docType: string, file: File) {
    setUploading(docType);
    setError(null);
    try {
      const form = new FormData();
      form.append("doc_type", docType);
      form.append("file", file);
      const res = await fetch("/api/driver/documents", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "העלאה נכשלה");
        return;
      }
      await fetchDocs();
    } finally {
      setUploading(null);
    }
  }

  // Active doc per type = highest-priority current row (approved > pending > rejected).
  const byType = new Map<string, DocRow>();
  for (const d of docs) {
    const existing = byType.get(d.doc_type);
    if (!existing) {
      byType.set(d.doc_type, d);
      continue;
    }
    const rank = (s: DocRow["status"]) => (s === "approved" ? 3 : s === "pending" ? 2 : 1);
    if (rank(d.status) > rank(existing.status)) byType.set(d.doc_type, d);
  }

  const allApproved = DOC_TYPES.every((dt) => byType.get(dt.value)?.status === "approved");

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-2">רישום ראשוני</h1>
      <p className="text-sm text-muted mb-6">
        העלה את כל המסמכים הנדרשים. אישור כולם משדרג את הסטטוס שלך לנהג מאומת.
      </p>

      {allApproved && (
        <div className="card !p-3 mb-4 bg-green-50 border-green-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            כל המסמכים מאושרים. אתה רשום כנהג מאומת.
          </span>
        </div>
      )}

      {error && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {DOC_TYPES.map((dt) => {
          const doc = byType.get(dt.value);
          const cfg = doc ? STATUS_CONFIG[doc.status] : null;
          const StatusIcon = cfg?.icon ?? FileText;
          return (
            <div key={dt.value} className="card !p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-primary">{dt.label}</h3>
                {cfg && (
                  <div className="flex items-center gap-1 text-sm" style={{ color: cfg.color }}>
                    <StatusIcon className="w-4 h-4" />
                    {cfg.label}
                  </div>
                )}
              </div>

              {doc && (
                <div className="text-xs text-muted mb-2">
                  הועלה: {new Date(doc.uploaded_at).toLocaleString("he-IL")}
                  {doc.status === "rejected" && doc.rejection_reason && (
                    <div className="text-red-600 mt-1">סיבת דחייה: {doc.rejection_reason}</div>
                  )}
                </div>
              )}

              <label className="btn-primary text-sm inline-flex cursor-pointer disabled:opacity-50">
                <Upload className="w-4 h-4" />
                {uploading === dt.value
                  ? "מעלה..."
                  : doc?.status === "approved"
                    ? "החלף"
                    : "העלה"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  disabled={uploading === dt.value}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(dt.value, f);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted mt-4">
        קבצים נתמכים: JPG / PNG / WebP / PDF. עד 10MB. רק אדמינים יכולים לראות את המסמכים.
      </div>
    </div>
  );
}

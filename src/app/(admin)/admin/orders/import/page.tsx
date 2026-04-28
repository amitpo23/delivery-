"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, ArrowRight, Download, CheckCircle2, XCircle } from "lucide-react";
import { parseCsv } from "@/lib/csv/parse";

interface CsvRow {
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  size: string;
  urgency: string;
  bookerFullName: string;
  bookerPhone: string;
  bookerEmail?: string;
  notes?: string;
}

const REQUIRED_HEADERS = [
  "pickupAddress",
  "pickupContactName",
  "pickupContactPhone",
  "deliveryAddress",
  "deliveryContactName",
  "deliveryContactPhone",
  "size",
  "urgency",
  "bookerFullName",
  "bookerPhone",
];

const SAMPLE_CSV = `pickupAddress,pickupContactName,pickupContactPhone,deliveryAddress,deliveryContactName,deliveryContactPhone,size,urgency,bookerFullName,bookerPhone,notes
"חיפה הרצל 5","ישראל ישראלי","050-1234567","עפולה רחוב הנשיא 12","דנה כהן","052-7654321",M,next_day,"חברת אקמה בע""מ","050-9999999","מסירה לאחר 16:00"
`;

interface ResultRow {
  rowIdx: number;
  status: "ok" | "error";
  orderNumber?: string;
  total?: number;
  error?: string;
}

export default function BulkImportPage() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const grid = parseCsv(text);
      if (grid.length < 2) {
        setParseError("הקובץ ריק");
        return;
      }
      const header = grid[0].map((h) => h.trim());
      const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
      if (missing.length > 0) {
        setParseError(`חסרות עמודות: ${missing.join(", ")}`);
        return;
      }
      const idx: Record<string, number> = {};
      header.forEach((h, i) => (idx[h] = i));
      const out: CsvRow[] = [];
      for (let i = 1; i < grid.length; i++) {
        const r = grid[i];
        out.push({
          pickupAddress: r[idx.pickupAddress] ?? "",
          pickupContactName: r[idx.pickupContactName] ?? "",
          pickupContactPhone: r[idx.pickupContactPhone] ?? "",
          deliveryAddress: r[idx.deliveryAddress] ?? "",
          deliveryContactName: r[idx.deliveryContactName] ?? "",
          deliveryContactPhone: r[idx.deliveryContactPhone] ?? "",
          size: r[idx.size] ?? "",
          urgency: r[idx.urgency] ?? "",
          bookerFullName: r[idx.bookerFullName] ?? "",
          bookerPhone: r[idx.bookerPhone] ?? "",
          bookerEmail: idx.bookerEmail !== undefined ? r[idx.bookerEmail] : undefined,
          notes: idx.notes !== undefined ? r[idx.notes] : undefined,
        });
      }
      setRows(out);
      setParseError(null);
      setResults(null);
    };
    reader.readAsText(file);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        setParseError(json.error ?? "ייבוא נכשל");
        return;
      }
      setResults(json.results ?? []);
    } finally {
      setSubmitting(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/orders" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-bold text-primary">ייבוא מ-CSV</h1>
      </div>

      <div className="card !p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-primary">העלאת קובץ</h2>
          <button onClick={downloadSample} className="text-xs text-secondary flex items-center gap-1">
            <Download className="w-3 h-3" />
            הורד תבנית
          </button>
        </div>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-sm" />
        <p className="text-xs text-muted mt-2">
          עמודות חובה: {REQUIRED_HEADERS.join(", ")}. גודל: S/M/L/XL. דחיפות: express/same_day/next_day/economy.
          תשלום נרשם כ-pending (חשבונית). מקסימום 500 שורות לקובץ.
        </p>
      </div>

      {parseError && (
        <div className="card !p-3 mb-4 bg-red-50 border-red-200 text-red-700 text-sm">{parseError}</div>
      )}

      {rows.length > 0 && !results && (
        <>
          <div className="card !p-4 mb-4">
            <h2 className="text-sm font-bold text-primary mb-3">תצוגה מקדימה ({rows.length} שורות)</h2>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right p-2">#</th>
                    <th className="text-right p-2">מוצא</th>
                    <th className="text-right p-2">יעד</th>
                    <th className="text-right p-2">גודל</th>
                    <th className="text-right p-2">דחיפות</th>
                    <th className="text-right p-2">לקוח</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-2 text-muted">{i + 1}</td>
                      <td className="p-2 truncate max-w-[200px]">{r.pickupAddress}</td>
                      <td className="p-2 truncate max-w-[200px]">{r.deliveryAddress}</td>
                      <td className="p-2">{r.size}</td>
                      <td className="p-2">{r.urgency}</td>
                      <td className="p-2 truncate max-w-[150px]">{r.bookerFullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <div className="text-xs text-muted text-center py-2">
                  ועוד {rows.length - 50} שורות...
                </div>
              )}
            </div>
          </div>

          <button onClick={submit} disabled={submitting} className="btn-primary disabled:opacity-50">
            <Upload className="w-4 h-4" />
            {submitting ? "מעבד..." : `ייבא ${rows.length} הזמנות`}
          </button>
        </>
      )}

      {results && (
        <div className="card !p-4">
          <h2 className="text-sm font-bold text-primary mb-3">תוצאות הייבוא</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card !p-3 bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-xl font-bold text-green-800">
                    {results.filter((r) => r.status === "ok").length}
                  </div>
                  <div className="text-xs text-green-700">נוצרו בהצלחה</div>
                </div>
              </div>
            </div>
            <div className="card !p-3 bg-red-50">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-xl font-bold text-red-800">
                    {results.filter((r) => r.status === "error").length}
                  </div>
                  <div className="text-xs text-red-700">נכשלו</div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.rowIdx}
                className={`p-2 rounded text-xs flex items-center justify-between ${
                  r.status === "ok" ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <span>שורה #{r.rowIdx + 1}</span>
                {r.status === "ok" ? (
                  <span className="font-mono text-green-800" dir="ltr">
                    {r.orderNumber} · {r.total}₪
                  </span>
                ) : (
                  <span className="text-red-800">{r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

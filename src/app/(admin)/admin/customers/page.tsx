"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Users, TrendingUp, ShoppingBag, ChevronLeft } from "lucide-react";

interface CustomerRow {
  id: string;
  customer_type: string;
  company_name: string | null;
  notes: string | null;
  tags: string[];
  full_name: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  delivered_orders: number;
  last_order_at: string | null;
  is_guest: boolean;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [guests, setGuests] = useState<CustomerRow[]>([]);
  const [includeGuests, setIncludeGuests] = useState(false);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = includeGuests ? "/api/admin/customers?guests=1" : "/api/admin/customers";
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "שגיאה בטעינה");
        return;
      }
      const json = await res.json();
      setCustomers(json.customers ?? []);
      setGuests(json.guests ?? []);
      setError(null);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [includeGuests]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allTags = Array.from(new Set(customers.flatMap((c) => c.tags))).sort();
  const merged = [...customers, ...guests];

  const filtered = merged.filter((c) => {
    const matchesSearch =
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.company_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesTag = !tagFilter || c.tags.includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  const totalRevenue = merged.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = merged.reduce((sum, c) => sum + c.total_orders, 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">לקוחות</h1>
          <p className="text-muted text-sm">
            {customers.length} רשומים | {guests.length} אורחים | סה&quot;כ הכנסה{" "}
            {totalRevenue.toLocaleString()}₪
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeGuests}
            onChange={(e) => setIncludeGuests(e.target.checked)}
            className="rounded"
          />
          <span>הצג גם אורחים</span>
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="card !p-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <div className="text-lg font-bold text-primary">{merged.length}</div>
            <div className="text-xs text-muted">סה&quot;כ</div>
          </div>
        </div>
        <div className="card !p-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-lg font-bold text-primary">{totalOrders}</div>
            <div className="text-xs text-muted">הזמנות</div>
          </div>
        </div>
        <div className="card !p-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <div>
            <div className="text-lg font-bold text-primary">{Math.round(avgOrder)}₪</div>
            <div className="text-xs text-muted">ממוצע להזמנה</div>
          </div>
        </div>
      </div>

      <div className="card !p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, טלפון, חברה..."
              className="input-field !pr-10"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={() => setTagFilter(null)}
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  tagFilter === null ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                הכל
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${
                    tagFilter === tag ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
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
                <th className="text-right p-4 font-medium text-muted">לקוח</th>
                <th className="text-right p-4 font-medium text-muted">סוג</th>
                <th className="text-right p-4 font-medium text-muted">טלפון</th>
                <th className="text-right p-4 font-medium text-muted">תגיות</th>
                <th className="text-right p-4 font-medium text-muted">הזמנות</th>
                <th className="text-right p-4 font-medium text-muted">הכנסה</th>
                <th className="text-right p-4 font-medium text-muted">אחרון</th>
                <th className="text-right p-4 font-medium text-muted"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    {c.full_name}
                    {c.company_name && (
                      <div className="text-xs text-muted">{c.company_name}</div>
                    )}
                  </td>
                  <td className="p-4 text-xs">
                    {c.is_guest ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">אורח</span>
                    ) : c.customer_type === "business" ? (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">עסקי</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">פרטי</span>
                    )}
                  </td>
                  <td className="p-4 text-xs" dir="ltr">{c.phone}</td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center">{c.total_orders}</td>
                  <td className="p-4 font-bold">{c.total_spent.toLocaleString()}₪</td>
                  <td className="p-4 text-xs text-muted" dir="ltr">
                    {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("he-IL") : "—"}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="flex items-center gap-1 text-secondary hover:text-secondary-dark text-sm"
                    >
                      פרטים
                      <ChevronLeft className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted">לא נמצאו לקוחות</div>
        )}
        {loading && <div className="text-center py-12 text-muted">טוען...</div>}
      </div>
    </div>
  );
}

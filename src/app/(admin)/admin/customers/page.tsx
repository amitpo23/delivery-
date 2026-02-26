"use client";

import { useState } from "react";
import { Search, Users, Mail, Phone, Package, DollarSign } from "lucide-react";
import { MOCK_CUSTOMERS } from "@/constants/mock-data";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const matchesSearch = !search || c.name.includes(search) || c.email.includes(search) || c.phone.includes(search);
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalRevenue = MOCK_CUSTOMERS.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">ניהול לקוחות</h1>
          <p className="text-muted text-sm">
            {MOCK_CUSTOMERS.length} לקוחות | הכנסה כוללת: {totalRevenue.toLocaleString()}₪
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-primary">{MOCK_CUSTOMERS.length}</div>
            <div className="text-xs text-muted">סה&quot;כ לקוחות</div>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-primary">
              {MOCK_CUSTOMERS.reduce((sum, c) => sum + c.totalOrders, 0)}
            </div>
            <div className="text-xs text-muted">סה&quot;כ הזמנות</div>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-primary">{totalRevenue.toLocaleString()}₪</div>
            <div className="text-xs text-muted">הכנסה כוללת</div>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-primary">
              {Math.round(totalRevenue / MOCK_CUSTOMERS.length)}₪
            </div>
            <div className="text-xs text-muted">ממוצע ללקוח</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card !p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              className="input-field !pr-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: "all", label: "הכל" },
              { value: "private", label: "פרטי" },
              { value: "business", label: "עסקי" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  typeFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="space-y-3">
        {filtered.map((customer) => (
          <div key={customer.id} className="card !p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{customer.name}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        customer.type === "business"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {customer.type === "business" ? "עסקי" : "פרטי"}
                    </span>
                  </div>
                  {"companyName" in customer && customer.companyName && (
                    <div className="text-xs text-muted">{customer.companyName}</div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{customer.totalOrders}</div>
                  <div className="text-xs text-muted">הזמנות</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{customer.totalSpent.toLocaleString()}₪</div>
                  <div className="text-xs text-muted">הוצאה</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted">{customer.lastOrder}</div>
                  <div className="text-xs text-muted">הזמנה אחרונה</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { User, MapPin, Save, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  contact_name: string | null;
  contact_phone: string | null;
}

interface ProfileForm {
  fullName: string;
  phone: string;
  email: string;
  customerType: "private" | "business";
  companyName: string;
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileForm>({
    fullName: "",
    phone: "",
    email: "",
    customerType: "private",
    companyName: "",
  });
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    contact_name: "",
    contact_phone: "",
  });
  const [addressBusy, setAddressBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) return;
    setUserId(userResult.user.id);

    const [profileRes, customerRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", userResult.user.id).maybeSingle(),
      supabase.from("customers").select("id, customer_type, company_name").eq("user_id", userResult.user.id).maybeSingle(),
    ]);

    setProfile({
      fullName: profileRes.data?.full_name ?? "",
      phone: profileRes.data?.phone ?? "",
      email: userResult.user.email ?? "",
      customerType: (customerRes.data?.customer_type as "private" | "business") ?? "private",
      companyName: customerRes.data?.company_name ?? "",
    });

    if (customerRes.data?.id) {
      setCustomerId(customerRes.data.id);
      const { data: addrData } = await supabase
        .from("saved_addresses")
        .select("id, label, address, contact_name, contact_phone")
        .eq("customer_id", customerRes.data.id)
        .order("created_at", { ascending: true });
      setAddresses((addrData ?? []) as SavedAddress[]);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    setError(null);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ full_name: profile.fullName, phone: profile.phone })
      .eq("id", userId);
    if (profErr) {
      setError(`שמירת פרופיל נכשלה: ${profErr.message}`);
      setSaving(false);
      return;
    }

    const customerPayload = {
      user_id: userId,
      customer_type: profile.customerType,
      company_name: profile.customerType === "business" ? profile.companyName || null : null,
    };

    if (customerId) {
      await supabase
        .from("customers")
        .update({ customer_type: customerPayload.customer_type, company_name: customerPayload.company_name })
        .eq("id", customerId);
    } else {
      const { data: created } = await supabase
        .from("customers")
        .insert(customerPayload)
        .select("id")
        .maybeSingle();
      if (created?.id) setCustomerId(created.id);
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setError("יש לשמור קודם פרטי לקוח");
      return;
    }
    setAddressBusy(true);
    const supabase = createClient();
    const { data, error: addErr } = await supabase
      .from("saved_addresses")
      .insert({
        customer_id: customerId,
        label: newAddress.label,
        address: newAddress.address,
        contact_name: newAddress.contact_name || null,
        contact_phone: newAddress.contact_phone || null,
      })
      .select("id, label, address, contact_name, contact_phone")
      .maybeSingle();
    if (addErr || !data) {
      setError(`הוספת כתובת נכשלה: ${addErr?.message ?? "לא ידוע"}`);
    } else {
      setAddresses((prev) => [...prev, data as SavedAddress]);
      setNewAddress({ label: "", address: "", contact_name: "", contact_phone: "" });
      setShowAddAddress(false);
    }
    setAddressBusy(false);
  }

  async function handleDeleteAddress(id: string) {
    const supabase = createClient();
    const { error: delErr } = await supabase.from("saved_addresses").delete().eq("id", id);
    if (!delErr) setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-primary">הפרופיל שלי</h1>

      <div className="card !p-8">
        <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-secondary" />
          פרטים אישיים
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleProfileChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                className="input-field"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל (לקריאה בלבד)</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="input-field bg-gray-50 text-gray-600"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סוג לקוח</label>
              <select
                name="customerType"
                value={profile.customerType}
                onChange={handleProfileChange}
                className="input-field"
              >
                <option value="private">פרטי</option>
                <option value="business">עסקי</option>
              </select>
            </div>
            {profile.customerType === "business" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם חברה</label>
                <input
                  type="text"
                  name="companyName"
                  value={profile.companyName}
                  onChange={handleProfileChange}
                  className="input-field"
                />
              </div>
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : saved ? "נשמר!" : "שמור שינויים"}
          </button>
        </form>
      </div>

      <div className="card !p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <MapPin className="w-5 h-5 text-secondary" />
            כתובות שמורות
          </h2>
          <button
            onClick={() => setShowAddAddress(true)}
            className="text-sm text-secondary hover:text-secondary-dark flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            הוסף כתובת
          </button>
        </div>

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                    {addr.label}
                  </span>
                  <span className="font-medium text-sm">{addr.address}</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {addr.contact_name ?? "—"} | {addr.contact_phone ?? "—"}
                </div>
              </div>
              <button
                onClick={() => handleDeleteAddress(addr.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {addresses.length === 0 && !showAddAddress && (
            <div className="text-center py-6 text-muted text-sm">אין כתובות שמורות עדיין</div>
          )}
        </div>

        {showAddAddress && (
          <form onSubmit={handleAddAddress} className="mt-4 p-4 border-2 border-dashed border-border rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newAddress.label}
                onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))}
                className="input-field"
                placeholder="תווית (בית, משרד...)"
                required
              />
              <input
                type="text"
                value={newAddress.address}
                onChange={(e) => setNewAddress((p) => ({ ...p, address: e.target.value }))}
                className="input-field"
                placeholder="כתובת מלאה"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newAddress.contact_name}
                onChange={(e) => setNewAddress((p) => ({ ...p, contact_name: e.target.value }))}
                className="input-field"
                placeholder="שם איש קשר"
              />
              <input
                type="tel"
                value={newAddress.contact_phone}
                onChange={(e) => setNewAddress((p) => ({ ...p, contact_phone: e.target.value }))}
                className="input-field"
                placeholder="טלפון"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addressBusy} className="btn-primary text-sm !py-2 disabled:opacity-50">
                {addressBusy ? "שומר..." : "שמור"}
              </button>
              <button type="button" onClick={() => setShowAddAddress(false)} className="btn-secondary text-sm !py-2">
                ביטול
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

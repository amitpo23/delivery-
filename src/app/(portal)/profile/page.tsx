"use client";

import { useState } from "react";
import { User, Phone, Mail, MapPin, Save, Plus, Trash2 } from "lucide-react";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: "אליהב כהן",
    phone: "050-1234567",
    email: "elihav@example.com",
    customerType: "business",
    companyName: "אליהב כהן פודגרופ ומשלוחים",
  });
  const [saved, setSaved] = useState(false);

  const [addresses, setAddresses] = useState<SavedAddress[]>([
    {
      id: "1",
      label: "משרד",
      address: "חיפה, רח' הרצל 15",
      contactName: "אליהב כהן",
      contactPhone: "050-1234567",
    },
  ]);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    contactName: "",
    contactPhone: "",
  });

  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    // TODO: Save to Supabase
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddresses((prev) => [...prev, { ...newAddress, id: Date.now().toString() }]);
    setNewAddress({ label: "", address: "", contactName: "", contactPhone: "" });
    setShowAddAddress(false);
  }

  function handleDeleteAddress(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-primary">הפרופיל שלי</h1>

      {/* Profile Form */}
      <div className="card !p-8">
        <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-secondary" />
          פרטים אישיים
        </h2>

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
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
              className="input-field"
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

          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" />
            {saved ? "נשמר!" : "שמור שינויים"}
          </button>
        </form>
      </div>

      {/* Saved Addresses */}
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
                  {addr.contactName} | {addr.contactPhone}
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
                value={newAddress.contactName}
                onChange={(e) => setNewAddress((p) => ({ ...p, contactName: e.target.value }))}
                className="input-field"
                placeholder="שם איש קשר"
              />
              <input
                type="tel"
                value={newAddress.contactPhone}
                onChange={(e) => setNewAddress((p) => ({ ...p, contactPhone: e.target.value }))}
                className="input-field"
                placeholder="טלפון"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm !py-2">שמור</button>
              <button type="button" onClick={() => setShowAddAddress(false)} className="btn-secondary text-sm !py-2">ביטול</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

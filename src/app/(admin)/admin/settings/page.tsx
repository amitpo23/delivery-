"use client";

import { useState } from "react";
import { Settings, MapPin, DollarSign, Bell, Save } from "lucide-react";
import { COVERAGE_AREAS, SERVICE_TYPES } from "@/constants/services";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("zones");
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: "zones", label: "אזורי שירות", icon: MapPin },
    { id: "pricing", label: "מחירון", icon: DollarSign },
    { id: "notifications", label: "התראות", icon: Bell },
    { id: "general", label: "כללי", icon: Settings },
  ];

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">הגדרות</h1>
        <p className="text-muted text-sm">ניהול הגדרות המערכת</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-white border border-border text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Zones Tab */}
      {activeTab === "zones" && (
        <div className="card !p-6">
          <h2 className="text-lg font-bold text-primary mb-4">אזורי שירות</h2>
          <div className="space-y-4">
            {COVERAGE_AREAS.map((area, index) => (
              <div key={area.name} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-primary">{area.name}</span>
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm text-muted">פעיל</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted">מחיר בסיס</label>
                    <input
                      type="number"
                      defaultValue={20 + index * 5}
                      className="input-field text-sm !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">מחיר לק&quot;מ</label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={1.0 + index * 0.2}
                      className="input-field text-sm !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">זמן מקסימלי (שעות)</label>
                    <input
                      type="number"
                      defaultValue={4 + index * 2}
                      className="input-field text-sm !py-1.5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="btn-primary mt-6">
            <Save className="w-4 h-4" />
            {saved ? "נשמר!" : "שמור שינויים"}
          </button>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="card !p-6">
          <h2 className="text-lg font-bold text-primary mb-4">הגדרות מחירון</h2>
          <div className="space-y-4">
            {SERVICE_TYPES.map((service) => (
              <div key={service.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <span className="font-bold text-primary">{service.name}</span>
                  <span className="text-xs text-muted">({service.timeframe})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted">מחיר בסיס (₪)</label>
                    <input type="number" defaultValue={service.basePrice} className="input-field text-sm !py-1.5" />
                  </div>
                  <div>
                    <label className="text-xs text-muted">מחיר לק&quot;מ (₪)</label>
                    <input type="number" step="0.1" defaultValue={1.5} className="input-field text-sm !py-1.5" />
                  </div>
                  <div>
                    <label className="text-xs text-muted">מחיר לק&quot;ג (₪)</label>
                    <input type="number" step="0.1" defaultValue={1.0} className="input-field text-sm !py-1.5" />
                  </div>
                  <div>
                    <label className="text-xs text-muted">מכפיל שעות שיא</label>
                    <input type="number" step="0.1" defaultValue={1.0} className="input-field text-sm !py-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="btn-primary mt-6">
            <Save className="w-4 h-4" />
            {saved ? "נשמר!" : "שמור שינויים"}
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="card !p-6">
          <h2 className="text-lg font-bold text-primary mb-4">הגדרות התראות</h2>
          <div className="space-y-4">
            {[
              { label: "SMS ללקוח בעת יצירת הזמנה", defaultChecked: true },
              { label: "SMS ללקוח בעת שיבוץ נהג", defaultChecked: true },
              { label: "SMS ללקוח בעת איסוף", defaultChecked: true },
              { label: "SMS ללקוח בעת מסירה", defaultChecked: true },
              { label: "SMS למקבל בעת שיבוץ נהג", defaultChecked: false },
              { label: "WhatsApp ללקוח", defaultChecked: false },
              { label: "אימייל סיכום יומי למנהל", defaultChecked: true },
              { label: "התראה על הזמנה שלא שובצה 30 דקות", defaultChecked: true },
            ].map((setting) => (
              <label key={setting.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                <span className="text-sm">{setting.label}</span>
                <input type="checkbox" defaultChecked={setting.defaultChecked} className="rounded" />
              </label>
            ))}
          </div>
          <button onClick={handleSave} className="btn-primary mt-6">
            <Save className="w-4 h-4" />
            {saved ? "נשמר!" : "שמור שינויים"}
          </button>
        </div>
      )}

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="card !p-6">
          <h2 className="text-lg font-bold text-primary mb-4">הגדרות כלליות</h2>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם החברה</label>
              <input type="text" defaultValue="אליהב כהן פודגרופ ומשלוחים" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input type="tel" defaultValue="04-XXX-XXXX" className="input-field" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
              <input type="email" defaultValue="info@elihav-delivery.co.il" className="input-field" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שעות פעילות</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" defaultValue="08:00" className="input-field" />
                <input type="time" defaultValue="20:00" className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מע&quot;מ (%)</label>
              <input type="number" defaultValue={17} className="input-field" />
            </div>
          </div>
          <button onClick={handleSave} className="btn-primary mt-6">
            <Save className="w-4 h-4" />
            {saved ? "נשמר!" : "שמור שינויים"}
          </button>
        </div>
      )}
    </div>
  );
}

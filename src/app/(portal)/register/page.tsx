"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    customerType: "private",
    companyName: "",
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
    setFormData((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("הסיסמאות לא תואמות");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: "customer",
          },
        },
      });

      if (signUpError || !data.user) {
        // Supabase returns "User already registered" for existing emails — surface
        // a localized message instead of leaking the raw error.
        setError(
          signUpError?.message?.includes("already")
            ? "המייל הזה כבר רשום במערכת. עברו להתחברות."
            : "שגיאה ביצירת החשבון. נסו שוב.",
        );
        return;
      }

      // Best-effort: create the customer row. handle_new_user() trigger created
      // the profile from raw_user_meta_data; the customer record is portal-only
      // metadata that requires an authenticated session (RLS: user_id = auth.uid()).
      // If the email-confirmation flow is enabled the session won't exist yet —
      // treat the failure as non-fatal and let the user complete it on first login.
      if (data.session) {
        await supabase.from("customers").insert({
          user_id: data.user.id,
          customer_type: formData.customerType,
          company_name: formData.customerType === "business" ? formData.companyName || null : null,
        });
        window.location.href = "/dashboard";
      } else {
        setError("נשלח אליך אימייל לאישור החשבון. אשרו אותו ואז התחברו.");
      }
    } catch {
      setError("שגיאה ביצירת החשבון. נסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-primary mt-4">{COMPANY_SHORT}</h1>
          <p className="text-muted mt-1">צרו חשבון חדש</p>
        </div>

        {/* Form */}
        <div className="card !p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="input-field !pr-10"
                  placeholder="השם המלא שלכם"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="input-field !pr-10"
                  placeholder="050-0000000"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימייל *</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-field !pr-10"
                  placeholder="your@email.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סוג לקוח</label>
              <select
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                className="input-field"
              >
                <option value="private">פרטי</option>
                <option value="business">עסקי</option>
              </select>
            </div>

            {formData.customerType === "business" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם החברה</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="שם העסק / החברה"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה *</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="input-field !pr-10 !pl-10"
                  placeholder="לפחות 6 תווים"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">אימות סיסמה *</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="input-field !pr-10"
                  placeholder="הזינו שוב את הסיסמה"
                  dir="ltr"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                required
                className="rounded mt-1"
              />
              <span className="text-gray-600">
                אני מסכים/ה ל
                <Link href="/terms" className="text-secondary hover:underline">תנאי השימוש</Link>
                {" "}ול
                <Link href="/privacy" className="text-secondary hover:underline">מדיניות הפרטיות</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !formData.agreeTerms}
              className="btn-primary w-full !py-3 text-lg disabled:opacity-50"
            >
              {loading ? "יוצר חשבון..." : "הרשמה"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            כבר יש לך חשבון?{" "}
            <Link href="/login" className="text-secondary font-medium hover:text-secondary-dark">
              התחברות
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-muted hover:text-primary">
            חזרה לאתר הראשי
          </Link>
        </div>
      </div>
    </div>
  );
}

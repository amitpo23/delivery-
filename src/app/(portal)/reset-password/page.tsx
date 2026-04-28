"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses the URL fragment (#access_token=...) on first load
    // and sets a session. We only let the user submit when that session
    // is present, otherwise an attacker who landed here without a token
    // could just type a new password for whoever is currently signed in.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasRecoverySession(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("הסיסמה חייבת להיות בת 6 תווים לפחות");
      return;
    }
    if (password !== confirm) {
      setError("הסיסמאות לא תואמות");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-primary mt-4">{COMPANY_SHORT}</h1>
        </div>

        <div className="card !p-8">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-primary mb-2">הסיסמה הוחלפה</h2>
              <p className="text-sm text-muted mb-6">אפשר להתחבר עם הסיסמה החדשה.</p>
              <Link href="/login" className="btn-primary inline-flex !py-3">
                התחברות
              </Link>
            </div>
          ) : hasRecoverySession === null ? (
            <div className="text-center text-muted">טוען...</div>
          ) : !hasRecoverySession ? (
            <div className="text-center">
              <h2 className="text-lg font-bold text-primary mb-2">קישור לא תקף</h2>
              <p className="text-sm text-muted mb-6">
                הקישור פג תוקף או שהוא כבר נוצל. בקש קישור חדש.
              </p>
              <Link href="/forgot-password" className="btn-primary inline-flex !py-3">
                בקש קישור חדש
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-primary mb-2">סיסמה חדשה</h2>
              <p className="text-sm text-muted mb-6">בחר סיסמה חדשה לחשבון שלך.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה חדשה</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">אישור סיסמה</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className="input-field !pr-10"
                      placeholder="הזן שוב"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-3 disabled:opacity-50"
                >
                  {loading ? "שומר..." : "שמור סיסמה חדשה"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

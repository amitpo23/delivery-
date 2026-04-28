"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) {
        // Don't expose whether the email exists — Supabase will quietly
        // skip nonexistent users, but its error wording can leak signal.
        // Show the same success message either way.
      }
      setSubmitted(true);
    } catch {
      setError("שגיאת רשת. נסה שוב.");
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
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-primary mb-2">בדוק את האימייל</h2>
              <p className="text-sm text-muted mb-6">
                אם {email} רשום אצלנו, נשלחה לשם הוראת איפוס. בדוק גם בתיקיית הספאם.
              </p>
              <Link href="/login" className="text-sm text-secondary hover:text-secondary-dark">
                חזרה להתחברות →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-primary mb-2">שכחתי סיסמה</h2>
              <p className="text-sm text-muted mb-6">
                הזן את האימייל שלך ונשלח קישור לאיפוס.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input-field !pr-10"
                      placeholder="your@email.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-3 disabled:opacity-50"
                >
                  {loading ? "שולח..." : "שלח קישור"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-muted">
                <Link
                  href="/login"
                  className="text-secondary hover:text-secondary-dark inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  חזרה להתחברות
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

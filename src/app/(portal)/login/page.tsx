"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const redirectTo = params.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (reason === "auth_unconfigured") {
      setError("שירות ההתחברות אינו זמין כרגע. נסו שוב מאוחר יותר.");
    }
  }, [reason]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !data.user) {
        setError("שם משתמש או סיסמה שגויים");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const target =
        redirectTo ??
        (profile?.role === "admin"
          ? "/admin/orders"
          : profile?.role === "driver"
            ? "/driver/tasks"
            : "/dashboard");

      // window.location forces a full reload so the middleware re-reads the
      // new session cookie before deciding what to render.
      window.location.href = target;
    } catch {
      setError("שגיאה בהתחברות. נסו שוב.");
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
          <p className="text-muted mt-1">התחברו לחשבון שלכם</p>
        </div>

        <div className="card !p-8">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field !pr-10 !pl-10"
                  placeholder="הזינו סיסמה"
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

            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                <span className="text-gray-600">זכור אותי</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-secondary hover:text-secondary-dark">
                שכחתי סיסמה
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3 text-lg disabled:opacity-50"
            >
              {loading ? "מתחבר..." : "התחברות"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            אין לך חשבון?{" "}
            <Link href="/register" className="text-secondary font-medium hover:text-secondary-dark">
              הרשמה
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

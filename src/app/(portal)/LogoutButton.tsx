"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full reload so middleware re-evaluates and the session cookies are cleared
    // from any cached server-rendered chunks.
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors ${className}`}
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden md:inline">יציאה</span>
    </button>
  );
}

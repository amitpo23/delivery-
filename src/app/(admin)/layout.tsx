"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Map,
  AlertCircle,
  History,
  Tag,
  Repeat,
  Mail,
} from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";

const sidebarLinks = [
  { href: "/admin", label: "דשבורד", icon: LayoutDashboard },
  { href: "/admin/orders", label: "הזמנות", icon: ClipboardList },
  { href: "/admin/recurring", label: "חוזרות", icon: Repeat },
  { href: "/admin/tickets", label: "פניות", icon: AlertCircle },
  { href: "/admin/live", label: "מפה חיה", icon: Map },
  { href: "/admin/drivers", label: "נהגים", icon: Truck },
  { href: "/admin/customers", label: "לקוחות", icon: Users },
  { href: "/admin/finance", label: "כספים", icon: DollarSign },
  { href: "/admin/coupons", label: "קופונים", icon: Tag },
  { href: "/admin/campaigns", label: "קמפיינים", icon: Mail },
  { href: "/admin/audit", label: "יומן", icon: History },
  { href: "/admin/settings", label: "הגדרות", icon: Settings },
];

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {/* atmospheric layers (matches SplitShell) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1000px 500px at 100% 0%, rgba(79,138,255,0.18), transparent 55%),
            radial-gradient(800px 600px at 0% 100%, rgba(30,99,242,0.16), transparent 60%),
            linear-gradient(180deg, #0A2540 0%, #102E55 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-white/10 p-6">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={onNavigate}
          >
            <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-white text-navy shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-white">
                {COMPANY_SHORT}
              </div>
              <div className="text-xs font-medium text-sky/80">פאנל ניהול</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/admin"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium transition-all ${
                  isActive
                    ? "bg-blue text-white shadow-[0_8px_22px_rgba(30,99,242,0.32)]"
                    : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${
                    isActive ? "text-white" : "text-sky/70 group-hover:text-sky"
                  }`}
                />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" />
            יציאה
          </Link>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar — Desktop */}
      <aside className="fixed z-40 hidden h-full w-64 shrink-0 overflow-hidden text-white lg:flex">
        <div className="relative flex h-full w-full flex-col">
          <SidebarContent pathname={pathname} />
        </div>
      </aside>

      {/* Sidebar — Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative h-full w-72 overflow-hidden text-white">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="סגור תפריט"
              className="absolute left-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-[10px] bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:mr-64">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-hairline bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="ml-2 grid h-9 w-9 place-items-center rounded-[10px] text-ink-soft transition-colors hover:bg-paper lg:hidden"
            aria-label="פתח תפריט"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button
              className="relative grid h-9 w-9 place-items-center rounded-[10px] text-mute transition-colors hover:bg-paper hover:text-ink"
              aria-label="התראות"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_3px_white]" />
            </button>
            <div className="flex items-center gap-2.5 rounded-full border border-hairline px-2 py-1.5 pl-3.5">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                א
              </div>
              <span className="hidden text-sm font-semibold text-ink md:block">
                אליהב כהן
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

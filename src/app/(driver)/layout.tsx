"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, DollarSign, User, Package } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";

const navItems = [
  { href: "/driver", label: "ראשי", icon: LayoutDashboard },
  { href: "/driver/tasks", label: "משימות", icon: ClipboardList },
  { href: "/driver/earnings", label: "רווחים", icon: DollarSign },
];

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/driver" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm">{COMPANY_SHORT} - נהג</span>
          </Link>

          <Link href="/driver/profile" className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-pb">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-lg transition-colors ${
                  isActive ? "text-secondary" : "text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

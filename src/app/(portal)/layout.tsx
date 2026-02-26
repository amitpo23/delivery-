import Link from "next/link";
import { Package, LayoutDashboard, PlusCircle, ClipboardList, User, LogOut } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="container-custom flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-primary">{COMPANY_SHORT}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-primary transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              דשבורד
            </Link>
            <Link
              href="/order"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-primary transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              הזמנה חדשה
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-primary transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              ההזמנות שלי
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-primary transition-colors"
            >
              <User className="w-4 h-4" />
              פרופיל
            </Link>
          </nav>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">יציאה</span>
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
        <div className="flex justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 py-1 px-3 text-gray-500 hover:text-primary">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs">דשבורד</span>
          </Link>
          <Link href="/order" className="flex flex-col items-center gap-1 py-1 px-3 text-gray-500 hover:text-primary">
            <PlusCircle className="w-5 h-5" />
            <span className="text-xs">הזמנה</span>
          </Link>
          <Link href="/orders" className="flex flex-col items-center gap-1 py-1 px-3 text-gray-500 hover:text-primary">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs">הזמנות</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-1 px-3 text-gray-500 hover:text-primary">
            <User className="w-5 h-5" />
            <span className="text-xs">פרופיל</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="container-custom py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}

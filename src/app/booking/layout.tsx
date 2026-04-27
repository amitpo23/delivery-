import Link from "next/link";
import { Package } from "lucide-react";
import { COMPANY_SHORT } from "@/constants/services";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="container-custom flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-primary">{COMPANY_SHORT}</span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-primary">
            לאתר הראשי
          </Link>
        </div>
      </header>
      <main className="container-custom py-6 md:py-10">{children}</main>
    </div>
  );
}

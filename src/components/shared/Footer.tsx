import Link from "next/link";
import { Package, Phone, Mail, MapPin } from "lucide-react";
import {
  COMPANY_NAME,
  COMPANY_SHORT,
  COMPANY_PHONE,
  COMPANY_EMAIL,
} from "@/constants/services";

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-bold">{COMPANY_SHORT}</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              {COMPANY_NAME} - חברת משלוחים מובילה באזור הצפון.
              אנו מספקים שירותי משלוחים מהירים, אמינים ובמחירים הוגנים.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">קישורים מהירים</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-white/70 hover:text-white transition-colors text-sm">
                דף הבית
              </Link>
              <Link href="/services" className="text-white/70 hover:text-white transition-colors text-sm">
                שירותים
              </Link>
              <Link href="/pricing" className="text-white/70 hover:text-white transition-colors text-sm">
                מחירון
              </Link>
              <Link href="/tracking" className="text-white/70 hover:text-white transition-colors text-sm">
                מעקב משלוח
              </Link>
              <Link href="/about" className="text-white/70 hover:text-white transition-colors text-sm">
                אודות
              </Link>
              <Link href="/contact" className="text-white/70 hover:text-white transition-colors text-sm">
                צור קשר
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-4">שירותים</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/services#express" className="text-white/70 hover:text-white transition-colors text-sm">
                משלוח אקספרס
              </Link>
              <Link href="/services#same-day" className="text-white/70 hover:text-white transition-colors text-sm">
                משלוח באותו יום
              </Link>
              <Link href="/services#next-day" className="text-white/70 hover:text-white transition-colors text-sm">
                משלוח ליום למחרת
              </Link>
              <Link href="/services#economy" className="text-white/70 hover:text-white transition-colors text-sm">
                משלוח חסכוני
              </Link>
              <Link href="/booking" className="text-secondary hover:text-secondary-light transition-colors text-sm font-medium">
                הזמן משלוח עכשיו
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">צרו קשר</h3>
            <div className="flex flex-col gap-3">
              <a
                href={`tel:${COMPANY_PHONE}`}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>{COMPANY_PHONE}</span>
              </a>
              <a
                href={`mailto:${COMPANY_EMAIL}`}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>{COMPANY_EMAIL}</span>
              </a>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>אזור הצפון, ישראל</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} {COMPANY_NAME}. כל הזכויות שמורות.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-white/50 hover:text-white transition-colors text-sm">
              מדיניות פרטיות
            </Link>
            <Link href="/terms" className="text-white/50 hover:text-white transition-colors text-sm">
              תנאי שימוש
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

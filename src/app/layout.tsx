import type { Metadata, Viewport } from "next";
import { Heebo, Inter, Geist } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "אליהב כהן פודגרופ ומשלוחים | משלוחים מהירים בצפון",
  description:
    "חברת משלוחים מובילה באזור הצפון. משלוחים מהירים, אמינים ובמחירים הוגנים. משלוח אקספרס, באותו יום ויום למחרת. כיסוי מלא מחיפה ועד קריית שמונה.",
  keywords: [
    "משלוחים",
    "שליחויות",
    "צפון",
    "חיפה",
    "משלוח מהיר",
    "אליהב כהן",
    "משלוחים בצפון",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "אליהב משלוחים",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A5F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={cn(heebo.variable, inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}

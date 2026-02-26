import type { Metadata } from "next";
import { Heebo, Inter } from "next/font/google";
import "./globals.css";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}

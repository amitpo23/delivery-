import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { SERVICE_TYPES, COMPANY_SHORT } from "@/constants/services";

export const metadata = {
  title: `שירותים | ${COMPANY_SHORT}`,
  description: "מגוון שירותי משלוחים באזור הצפון: אקספרס, אותו יום, יום למחרת וחסכוני.",
};

const serviceDetails = [
  {
    id: "express",
    features: [
      "איסוף תוך 30 דקות מרגע ההזמנה",
      "מסירה תוך 2-4 שעות",
      "מעקב GPS בזמן אמת",
      "אישור מסירה מיידי (SMS + תמונה)",
      "עדיפות עליונה בשיבוץ",
      "שירות 7 ימים בשבוע",
    ],
  },
  {
    id: "same_day",
    features: [
      "הזמנה עד 12:00 - מגיע עד סוף היום",
      "בחירת חלון זמנים (בוקר/צהריים/ערב)",
      "מעקב בזמן אמת",
      "אישור מסירה עם חתימה דיגיטלית",
      "מתאים לחבילות עד 30 ק\"ג",
      "ימים א'-ה'",
    ],
  },
  {
    id: "next_day",
    features: [
      "איסוף עד סוף יום העסקים",
      "מסירה ביום העסקים הבא",
      "בחירת חלון זמנים מועדף",
      "מעקב סטטוס בזמן אמת",
      "אפשרות לביטוח משלוח",
      "המחיר הפופולרי ביותר",
    ],
  },
  {
    id: "economy",
    features: [
      "האופציה הכי חסכונית",
      "מסירה תוך 2-3 ימי עסקים",
      "מתאים לחבילות לא דחופות",
      "מעקב סטטוס",
      "אפשרות להובלת חבילות גדולות",
      "חיסכון של עד 50% מאקספרס",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container-custom">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">השירותים שלנו</h1>
          <p className="text-white/70 text-lg max-w-xl">
            מגוון פתרונות משלוח המותאמים לכל צורך - מדחוף ביותר ועד חסכוני
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="space-y-12">
            {SERVICE_TYPES.map((service, index) => {
              const Icon = service.icon;
              const details = serviceDetails.find((d) => d.id === service.id);
              const isEven = index % 2 === 1;

              return (
                <div
                  key={service.id}
                  id={service.id === "same_day" ? "same-day" : service.id === "next_day" ? "next-day" : service.id}
                  className={`card !p-8 md:!p-12 flex flex-col md:flex-row gap-8 items-center ${isEven ? "md:flex-row-reverse" : ""}`}
                >
                  {/* Icon Side */}
                  <div className="shrink-0">
                    <div
                      className="w-32 h-32 rounded-3xl flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}15` }}
                    >
                      <Icon className="w-16 h-16" style={{ color: service.color }} />
                    </div>
                  </div>

                  {/* Content Side */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-primary">{service.name}</h2>
                      <span
                        className="px-3 py-1 text-sm font-medium rounded-full text-white"
                        style={{ backgroundColor: service.color }}
                      >
                        {service.timeframe}
                      </span>
                    </div>
                    <p className="text-muted mb-6">{service.longDescription}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {details?.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-sm text-muted">החל מ-</span>
                        <span className="text-3xl font-bold text-primary mr-1">{service.basePrice}₪</span>
                      </div>
                      <Link href="/booking" className="btn-primary">
                        הזמן עכשיו
                        <ArrowLeft className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-custom">
          <h2 className="section-title">השוואת שירותים</h2>
          <p className="section-subtitle">בחרו את השירות המתאים לכם</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-4 text-right rounded-tr-xl">תכונה</th>
                  {SERVICE_TYPES.map((s) => (
                    <th key={s.id} className="p-4 text-center last:rounded-tl-xl">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">זמן מסירה</td>
                  <td className="p-4 text-center">2-4 שעות</td>
                  <td className="p-4 text-center">עד סוף היום</td>
                  <td className="p-4 text-center">יום עסקים הבא</td>
                  <td className="p-4 text-center">2-3 ימי עסקים</td>
                </tr>
                <tr className="border-b border-border bg-gray-50">
                  <td className="p-4 font-medium">מחיר התחלתי</td>
                  <td className="p-4 text-center font-bold">79₪</td>
                  <td className="p-4 text-center font-bold">49₪</td>
                  <td className="p-4 text-center font-bold">35₪</td>
                  <td className="p-4 text-center font-bold">25₪</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">מעקב בזמן אמת</td>
                  <td className="p-4 text-center text-accent">✓</td>
                  <td className="p-4 text-center text-accent">✓</td>
                  <td className="p-4 text-center text-accent">✓</td>
                  <td className="p-4 text-center text-muted">סטטוס בלבד</td>
                </tr>
                <tr className="border-b border-border bg-gray-50">
                  <td className="p-4 font-medium">אישור מסירה</td>
                  <td className="p-4 text-center">תמונה + חתימה</td>
                  <td className="p-4 text-center">חתימה</td>
                  <td className="p-4 text-center">חתימה</td>
                  <td className="p-4 text-center">חתימה</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">ימי פעילות</td>
                  <td className="p-4 text-center">א'-שבת</td>
                  <td className="p-4 text-center">א'-ה'</td>
                  <td className="p-4 text-center">א'-ה'</td>
                  <td className="p-4 text-center">א'-ה'</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium"></td>
                  {SERVICE_TYPES.map((s) => (
                    <td key={s.id} className="p-4 text-center">
                      <Link href="/booking" className="btn-primary text-sm !py-2 !px-4">
                        הזמן
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

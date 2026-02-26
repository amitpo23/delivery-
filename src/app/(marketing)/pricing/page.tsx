import { COMPANY_SHORT } from "@/constants/services";
import PriceCalculatorFull from "@/components/marketing/PriceCalculatorFull";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: `מחירון | ${COMPANY_SHORT}`,
  description: "מחשבון מחירי משלוחים באזור הצפון. חשבו מחיר משלוח בקלות ובמהירות.",
};

const businessPlans = [
  {
    name: "סטארטר",
    description: "לעסקים קטנים עד 50 משלוחים בחודש",
    price: "החל מ-20₪",
    priceNote: "למשלוח",
    features: [
      "עד 50 משלוחים בחודש",
      "מעקב בזמן אמת",
      "אישורי מסירה",
      "שירות לקוחות בטלפון",
      "דוח חודשי",
    ],
    cta: "התחל עכשיו",
    highlighted: false,
  },
  {
    name: "עסקי",
    description: "לעסקים בינוניים 50-200 משלוחים בחודש",
    price: "החל מ-16₪",
    priceNote: "למשלוח",
    features: [
      "עד 200 משלוחים בחודש",
      "מעקב GPS בזמן אמת",
      "API לחיבור החנות",
      "מנהל לקוח אישי",
      "דוחות מפורטים",
      "חשבונית חודשית",
    ],
    cta: "צור קשר",
    highlighted: true,
  },
  {
    name: "אנטרפרייז",
    description: "לעסקים גדולים מעל 200 משלוחים בחודש",
    price: "מחיר מותאם",
    priceNote: "אישית",
    features: [
      "משלוחים ללא הגבלה",
      "כל פיצ'רי העסקי",
      "SLA מובטח",
      "אינטגרציה מותאמת",
      "Dashboard ייעודי",
      "עדיפות בשיבוץ",
      "תנאי תשלום גמישים",
    ],
    cta: "בואו נדבר",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container-custom">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">מחירון</h1>
          <p className="text-white/70 text-lg max-w-xl">
            מחירים שקופים והוגנים. חשבו את מחיר המשלוח שלכם בשניות
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <h2 className="section-title">מחשבון מחירים</h2>
          <p className="section-subtitle">הזינו את פרטי המשלוח וקבלו הערכת מחיר מיידית</p>
          <PriceCalculatorFull />
        </div>
      </section>

      {/* Business Plans */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-custom">
          <h2 className="section-title">חבילות לעסקים</h2>
          <p className="section-subtitle">פתרונות משלוח מותאמים לעסק שלכם</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {businessPlans.map((plan) => (
              <div
                key={plan.name}
                className={`card !p-8 flex flex-col ${
                  plan.highlighted
                    ? "!border-secondary !shadow-lg relative"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 right-6 bg-secondary text-white text-sm font-bold px-4 py-1 rounded-full">
                    הכי פופולרי
                  </div>
                )}
                <h3 className="text-xl font-bold text-primary">{plan.name}</h3>
                <p className="text-muted text-sm mt-1 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  <span className="text-muted text-sm mr-1">{plan.priceNote}</span>
                </div>
                <div className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/contact"
                  className={plan.highlighted ? "btn-primary w-full text-center" : "btn-secondary w-full text-center"}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

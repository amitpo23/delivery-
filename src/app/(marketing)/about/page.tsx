import { COMPANY_NAME, COMPANY_SHORT } from "@/constants/services";
import { Target, Heart, Users, TrendingUp } from "lucide-react";

export const metadata = {
  title: `אודות | ${COMPANY_SHORT}`,
  description: `${COMPANY_NAME} - חברת משלוחים מובילה באזור הצפון. הכירו את הסיפור, הצוות והערכים שלנו.`,
};

const values = [
  {
    icon: Target,
    title: "אמינות",
    description: "אנחנו מתחייבים לעמוד בזמנים ולספק שירות שאפשר לסמוך עליו.",
  },
  {
    icon: Heart,
    title: "שירות אישי",
    description: "כל לקוח חשוב לנו. אנחנו כאן בשבילכם עם מענה אנושי ואכפתי.",
  },
  {
    icon: Users,
    title: "קהילה",
    description: "אנחנו חלק מהקהילה בצפון ומחוברים לאנשים ולעסקים באזור.",
  },
  {
    icon: TrendingUp,
    title: "חדשנות",
    description: "משקיעים בטכנולוגיה מתקדמת כדי לתת לכם את חוויית המשלוח הטובה ביותר.",
  },
];

const milestones = [
  { year: "2020", title: "ההקמה", description: "התחלנו עם רכב אחד וחלום גדול" },
  { year: "2021", title: "צמיחה", description: "הרחבנו ל-5 שליחים וכיסוי חיפה והקריות" },
  { year: "2022", title: "טכנולוגיה", description: "השקנו מערכת מעקב בזמן אמת" },
  { year: "2023", title: "הצפון כולו", description: "הרחבנו כיסוי לכל אזור הצפון" },
  { year: "2024", title: "שותפויות", description: "חיברנו עשרות עסקים למערכת שלנו" },
  { year: "2025", title: "הדור הבא", description: "השקנו את המערכת החדשה עם הזמנה ישירה ללקוחות" },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container-custom">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">אודות</h1>
          <p className="text-white/70 text-lg max-w-xl">
            הכירו את {COMPANY_NAME} - החברה שמחברת את הצפון
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="section-title">הסיפור שלנו</h2>
            <div className="text-lg text-gray-700 leading-relaxed space-y-4 mt-8">
              <p>
                {COMPANY_NAME} נולדה מתוך הבנה פשוטה: אנשים ועסקים בצפון ראויים לשירות
                משלוחים מקצועי, מהיר ואמין - בדיוק כמו במרכז.
              </p>
              <p>
                התחלנו כעסק קטן עם חזון גדול. מהר מאוד הבנו שהמפתח להצלחה הוא השילוב
                בין שירות אישי לטכנולוגיה מתקדמת. כך בנינו מערכת שמאפשרת לכם להזמין
                משלוח בקלות, לעקוב אחריו בזמן אמת ולקבל שירות שתמיד עולה על הציפיות.
              </p>
              <p>
                היום אנחנו מעסיקים צוות של עשרות שליחים מסורים שמכירים כל רחוב
                ויישוב בצפון, ומשרתים אלפי לקוחות פרטיים ועסקיים.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container-custom">
          <h2 className="section-title">הערכים שלנו</h2>
          <p className="section-subtitle">העקרונות שמנחים אותנו בכל יום</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="card text-center">
                  <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">{value.title}</h3>
                  <p className="text-muted text-sm">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <h2 className="section-title">הדרך שלנו</h2>
          <p className="section-subtitle">אבני דרך משמעותיות במסע שלנו</p>

          <div className="max-w-2xl mx-auto">
            {milestones.map((milestone, index) => (
              <div key={milestone.year} className="flex gap-4 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {milestone.year}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 flex-1 bg-primary/20 min-h-[2rem]" />
                  )}
                </div>
                <div className="pb-4">
                  <h3 className="text-lg font-bold text-primary">{milestone.title}</h3>
                  <p className="text-muted">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

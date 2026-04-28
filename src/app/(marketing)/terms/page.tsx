import type { Metadata } from "next";
import { COMPANY_SHORT } from "@/constants/services";

export const metadata: Metadata = {
  title: `תנאי שימוש | ${COMPANY_SHORT}`,
  description: "תנאי השימוש של אליהב כהן פודגרופ ומשלוחים",
};

const LAST_UPDATED = "28 באפריל 2026";

/**
 * Generic Israeli e-commerce terms-of-service template. Replace
 * placeholder fields (company id, address, contact email) before
 * going live and have an attorney review.
 */
export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto py-8 prose prose-sm">
      <h1 className="text-2xl font-bold text-primary mb-2">תנאי שימוש</h1>
      <p className="text-xs text-muted mb-8">עודכן לאחרונה: {LAST_UPDATED}</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-800">
        <section>
          <h2 className="font-bold text-primary text-base mb-2">1. מבוא</h2>
          <p>
            ברוכים הבאים לאתר {COMPANY_SHORT} (להלן: &quot;החברה&quot;, &quot;אנחנו&quot;).
            תנאי השימוש (להלן: &quot;התנאים&quot;) מסדירים את היחסים בינך לבין החברה בעת
            השימוש בשירות. השימוש בשירות מהווה הסכמה לתנאים אלה. אם אינך מסכים, אנא הימנע
            מהשימוש.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">2. שירותי המשלוח</h2>
          <p>
            החברה מספקת שירותי משלוחים באזור צפון הארץ — חיפה, מועצות אזוריות מגידו, גלבוע, בקעת
            בית שאן, עפולה, התענכים, רמת ישי וקריית טבעון. כל הזמנה כפופה לבדיקת זמינות וכיסוי.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">3. רמות שירות (SLA)</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>אקספרס: עד 4 שעות</li>
            <li>באותו יום: עד 12 שעות</li>
            <li>יום למחרת: עד 30 שעות</li>
            <li>חסכון: עד 72 שעות</li>
          </ul>
          <p className="mt-2">
            הזמנים נמדדים מרגע יצירת ההזמנה. במקרה של איחור משמעותי שאינו נובע מנסיבות שאין
            לחברה שליטה עליהן (תאונה, מזג אוויר חריג, סגירת כביש), נציע פיצוי לפי שיקול דעת.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">4. תשלום</h2>
          <p>
            התשלום נגבה בעת ביצוע ההזמנה. לקוחות עסקיים יכולים לקבל חשבון תקופתי בהסכמה מראש.
            כל המחירים כוללים מע&quot;מ. במקרה של ביטול ע&quot;י הלקוח לפני שיבוץ נהג, יוחזר מלוא הסכום.
            ביטול לאחר שיבוץ עשוי לכלול דמי טיפול.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">5. אחריות החברה</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>אחריות מקסימלית לחבילה: 1,000₪. ערך גבוה מזה דורש ביטוח שמוצע בעת ההזמנה.</li>
            <li>החברה אינה אחראית לתכולה אסורה או רגישה (כסף מזומן, חומרים מסוכנים, תרופות מרשם וכו&apos;).</li>
            <li>הלקוח אחראי לאריזה תקינה. נזק שנגרם בשל אריזה לא נאותה — אינו באחריות החברה.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">6. חובות הלקוח</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>למסור פרטים מדויקים (כתובות, טלפונים)</li>
            <li>לוודא שהנמען זמין בשעת המסירה</li>
            <li>לא למסור חבילות עם תכולה אסורה</li>
            <li>לשלם במועד</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">7. הגבלת אחריות</h2>
          <p>
            למעט במקרים של רשלנות חמורה או מעשה בכוונה, אחריות החברה מוגבלת לסכום ששולם בעבור
            ההזמנה הספציפית. החברה אינה אחראית לנזקים עקיפים, אובדן רווחים או נזקים תוצאתיים.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">8. תלונות והחזרים</h2>
          <p>
            ניתן לפתוח פנייה דרך עמוד המעקב של ההזמנה או במייל
            <a href="mailto:support@elihav.co.il" className="text-secondary"> support@elihav.co.il</a>.
            נטפל בכל פנייה תוך 5 ימי עסקים.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">9. קניין רוחני</h2>
          <p>
            כל הזכויות באתר, בעיצוב, בלוגו ובתכנים שייכות לחברה. אין להעתיק, לשכפל או להשתמש בהם
            ללא רשות מפורשת בכתב.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">10. שינויים בתנאים</h2>
          <p>
            אנו רשאים לעדכן את התנאים מעת לעת. הגרסה העדכנית תפורסם בעמוד זה. שימוש לאחר עדכון
            מהווה הסכמה לגרסה החדשה.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">11. סמכות שיפוט</h2>
          <p>
            תנאים אלה כפופים לדיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט בחיפה.
          </p>
        </section>

        <section className="border-t border-border pt-4 text-xs text-muted">
          <p>
            למידע נוסף, פנו אל
            <a href="mailto:support@elihav.co.il" className="text-secondary"> support@elihav.co.il</a>.
          </p>
          <p className="mt-2">
            <strong>הערה:</strong> מסמך זה הוא תבנית כללית. מומלץ להעביר לבדיקת עורך/ת דין לפני
            הפעלה מסחרית.
          </p>
        </section>
      </div>
    </article>
  );
}

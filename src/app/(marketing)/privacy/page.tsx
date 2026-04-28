import type { Metadata } from "next";
import { COMPANY_SHORT } from "@/constants/services";

export const metadata: Metadata = {
  title: `מדיניות פרטיות | ${COMPANY_SHORT}`,
  description: "מדיניות הפרטיות של אליהב כהן פודגרופ ומשלוחים",
};

const LAST_UPDATED = "28 באפריל 2026";

/**
 * Generic Israeli e-commerce privacy policy template. The user should
 * have it reviewed by an attorney before going live — this is a
 * starting point, not legal advice.
 */
export default function PrivacyPage() {
  return (
    <article className="max-w-3xl mx-auto py-8 prose prose-sm">
      <h1 className="text-2xl font-bold text-primary mb-2">מדיניות פרטיות</h1>
      <p className="text-xs text-muted mb-8">עודכן לאחרונה: {LAST_UPDATED}</p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-800">
        <section>
          <h2 className="font-bold text-primary text-base mb-2">1. כללי</h2>
          <p>
            {COMPANY_SHORT} (להלן: &quot;החברה&quot;) מכבדת את פרטיות המשתמשים באתר ובאפליקציה
            (להלן: &quot;השירות&quot;). מדיניות זו מתארת אילו פרטים נאספים, כיצד הם נשמרים ומשמשים,
            ומהן הזכויות שלך כמשתמש. השימוש בשירות מהווה הסכמה למדיניות זו.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">2. איזה מידע אנחנו אוספים</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>פרטי קשר: שם, מספר טלפון, כתובת מייל</li>
            <li>פרטי הזמנה: כתובות איסוף ומסירה, גודל חבילה, פרטי איש קשר</li>
            <li>פרטי תשלום: 4 ספרות אחרונות של אמצעי התשלום (פרטי האשראי המלאים מטופלים ע&quot;י ספק התשלומים בלבד)</li>
            <li>נתוני שימוש: כתובת IP, סוג דפדפן, פעולות באתר</li>
            <li>במקרה של נהג: רישיון נהיגה, רישיון רכב, ביטוח, תעודת זהות, מיקום GPS בזמן עבודה</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">3. איך אנחנו משתמשים במידע</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>ביצוע ההזמנה ומסירתה לשליח המתאים</li>
            <li>שליחת עדכוני סטטוס באמצעות SMS, WhatsApp, Telegram, או מייל</li>
            <li>חשבונית מס וקבלות</li>
            <li>שיפור השירות, ניתוחים סטטיסטיים</li>
            <li>הפצת מבצעים ומידע שיווקי, רק אם נתת על כך הסכמה (אפשר לבטל בכל עת)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">4. שיתוף מידע עם צדדים שלישיים</h2>
          <p>אנחנו משתפים מידע עם הספקים הבאים, רק במידה הנדרשת לאספקת השירות:</p>
          <ul className="list-disc pr-6 space-y-1 mt-2">
            <li>ספק תשלומים (לצורך חיוב)</li>
            <li>ספק ענן (Vercel, Supabase, Google Cloud)</li>
            <li>ספק תקשורת (Green API ל-WhatsApp, Telegram)</li>
            <li>השליח שמבצע את המשלוח</li>
          </ul>
          <p className="mt-2">
            איננו מוכרים מידע אישי לצדדים שלישיים לצרכים פרסומיים.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">5. אבטחה</h2>
          <p>
            המידע נשמר על תשתיות ענן מובילות עם הצפנה במנוחה ובמעבר. גישה למידע מוגבלת לעובדים
            מורשים בלבד ומתועדת ביומן. עם זאת, אין מערכת חסינה לחלוטין; אנא הקפד על שמירת סיסמתך.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">6. זכויותיך</h2>
          <p>
            על פי חוק הגנת הפרטיות וה-GDPR (אם רלוונטי), אתה זכאי:
          </p>
          <ul className="list-disc pr-6 space-y-1 mt-2">
            <li>לעיין במידע שאנחנו מחזיקים אודותיך</li>
            <li>לבקש תיקון מידע שגוי</li>
            <li>לבקש מחיקת המידע (זכות להישכח), בכפוף לחובות חוקיות לשמור מסמכי מס</li>
            <li>לבטל הסכמה לדיוור שיווקי</li>
          </ul>
          <p className="mt-2">
            לפנייה: <a href="mailto:privacy@elihav.co.il" className="text-secondary">privacy@elihav.co.il</a>
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">7. עוגיות (Cookies)</h2>
          <p>
            השירות משתמש בעוגיות לזיהוי הפעלה ולשיפור החוויה. ניתן להשבית עוגיות בהגדרות הדפדפן,
            אך חלק מהפונקציונליות (כמו התחברות) לא יעבוד בלעדיהן.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">8. שמירת מידע</h2>
          <p>
            פרטי הזמנה נשמרים 7 שנים לעמידה בדרישות חוק. פרטי לקוח רשום שאינו פעיל יותר מ-3 שנים
            עוברים ארכוב; ניתן לבקש מחיקה מוקדמת בכפוף לסעיף 6.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-primary text-base mb-2">9. שינויים במדיניות</h2>
          <p>
            עדכונים מהותיים יישלחו במייל ויפורסמו בעמוד זה. המשך שימוש בשירות לאחר עדכון מהווה
            הסכמה לגרסה החדשה.
          </p>
        </section>

        <section className="border-t border-border pt-4 text-xs text-muted">
          <p>
            למידע נוסף או שאלות,
            פנו אל <a href="mailto:privacy@elihav.co.il" className="text-secondary">privacy@elihav.co.il</a>.
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

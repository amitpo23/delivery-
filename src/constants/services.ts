import { Clock, Zap, Truck, Package } from "lucide-react";

export const COMPANY_NAME = "אליהב כהן פודגרופ ומשלוחים";
export const COMPANY_SHORT = "אליהב משלוחים";
export const COMPANY_PHONE = "04-XXX-XXXX";
export const COMPANY_WHATSAPP = "972XXXXXXXXX";
export const COMPANY_EMAIL = "info@elihav-delivery.co.il";

export const SERVICE_TYPES = [
  {
    id: "express",
    name: "אקספרס",
    description: "משלוח תוך 2-4 שעות",
    longDescription: "משלוח מהיר במיוחד לאלו שצריכים את החבילה בדחיפות. השליח יוצא לדרך מיד עם קבלת ההזמנה.",
    icon: Zap,
    timeframe: "2-4 שעות",
    basePrice: 79,
    color: "#EF4444",
  },
  {
    id: "same_day",
    name: "באותו יום",
    description: "משלוח עד סוף היום",
    longDescription: "הזמנתם בבוקר? החבילה תגיע עוד היום. שירות אמין ומהיר למשלוחים שלא יכולים לחכות.",
    icon: Clock,
    timeframe: "עד סוף היום",
    basePrice: 49,
    color: "#F97316",
  },
  {
    id: "next_day",
    name: "יום למחרת",
    description: "משלוח ביום העסקים הבא",
    longDescription: "השירות הפופולרי ביותר שלנו. המשלוח יגיע ביום העסקים הבא באזור הזמנים שתבחרו.",
    icon: Truck,
    timeframe: "יום עסקים הבא",
    basePrice: 35,
    color: "#3B82F6",
  },
  {
    id: "economy",
    name: "חסכוני",
    description: "משלוח תוך 2-3 ימי עסקים",
    longDescription: "האופציה החסכונית ביותר. מתאים למשלוחים שאינם דחופים ורוצים לחסוך בעלויות.",
    icon: Package,
    timeframe: "2-3 ימי עסקים",
    basePrice: 25,
    color: "#10B981",
  },
] as const;

export const COVERAGE_AREAS = [
  {
    name: "חיפה והקריות",
    cities: ["חיפה", "קריית אתא", "קריית ביאליק", "קריית מוצקין", "קריית ים", "נשר", "טירת כרמל"],
  },
  {
    name: "עכו-נהריה",
    cities: ["עכו", "נהריה", "מעלות-תרשיחא", "שלומי"],
  },
  {
    name: "הגליל",
    cities: ["כרמיאל", "צפת", "ראש פינה", "חצור הגלילית", "קריית שמונה"],
  },
  {
    name: "העמקים",
    cities: ["עפולה", "נצרת", "נוף הגליל", "מגדל העמק", "יוקנעם", "טבריה"],
  },
  {
    name: "עמק יזרעאל",
    cities: ["קיבוצים ומושבים", "ישובים כפריים"],
  },
  {
    name: "הגולן",
    cities: ["קצרין", "ישובי רמת הגולן"],
  },
];

export const PACKAGE_TYPES = [
  { id: "documents", name: "מסמכים", icon: "📄", surcharge: 0 },
  { id: "small_package", name: "חבילה קטנה", icon: "📦", surcharge: 0 },
  { id: "package", name: "חבילה", icon: "📦", surcharge: 10 },
  { id: "fragile", name: "שברירי", icon: "⚠️", surcharge: 20 },
  { id: "heavy", name: "כבד (30+ ק\"ג)", icon: "🏋️", surcharge: 40 },
] as const;

export const WEIGHT_RANGES = [
  { id: "light", name: "עד 5 ק\"ג", maxKg: 5, surcharge: 0 },
  { id: "medium", name: "5-15 ק\"ג", maxKg: 15, surcharge: 10 },
  { id: "heavy", name: "15-30 ק\"ג", maxKg: 30, surcharge: 25 },
  { id: "very_heavy", name: "מעל 30 ק\"ג", maxKg: 100, surcharge: 50 },
] as const;

export const ADVANTAGES = [
  {
    title: "מהירות",
    description: "משלוחים תוך שעות ספורות באזור הצפון",
    icon: "⚡",
  },
  {
    title: "מעקב בזמן אמת",
    description: "עקבו אחרי המשלוח שלכם בכל רגע על המפה",
    icon: "📍",
  },
  {
    title: "מחירים הוגנים",
    description: "מחירים שקופים ותחרותיים, ללא עלויות נסתרות",
    icon: "💰",
  },
  {
    title: "שירות אישי",
    description: "צוות מסור שזמין עבורכם בכל שאלה",
    icon: "🤝",
  },
  {
    title: "כיסוי מלא בצפון",
    description: "מחיפה ועד קריית שמונה, כולל ישובים כפריים",
    icon: "🗺️",
  },
  {
    title: "אמינות",
    description: "אחוזי הגעה בזמן של מעל 95%",
    icon: "✅",
  },
];

export const TESTIMONIALS = [
  {
    name: "יעל כהן",
    role: "בעלת חנות אונליין",
    text: "מאז שעברתי לאליהב משלוחים, הלקוחות שלי מרוצים הרבה יותר. המשלוחים מגיעים בזמן והשירות מצוין.",
    rating: 5,
  },
  {
    name: "אבי לוי",
    role: "מנהל מסעדה",
    text: "שירות אמין ומהיר. השליחים אדיבים והמשלוחים תמיד מגיעים בשלמות. ממליץ בחום!",
    rating: 5,
  },
  {
    name: "רונית דוד",
    role: "לקוחה פרטית",
    text: "שלחתי חבילה דחופה לסבתא בצפת ותוך 3 שעות היא כבר קיבלה. שירות מדהים!",
    rating: 5,
  },
];

# מערכת ניהול משלוחים - אפיון מלא
# Delivery Management System - Full Specification

---

## 1. סקירת שוק המשלוחים בישראל

### 1.1 שחקנים מרכזיים בשוק

| חברה | התמחות | נקודות חוזק | טכנולוגיה |
|------|---------|-------------|-----------|
| **HFD** | משלוחי e-commerce, B2C | פריסה ארצית, משלוח ליום למחרת, לוקרים | WordPress + מערכת ניהול פנימית |
| **Cargo** | שליחויות ארציות | מרכזי מיון חדשניים, צי שליחים גדול | מערכת ניהול מתקדמת |
| **Wolt** | משלוחי מזון וקמעונאות | UX מצוין, מעקב real-time, כיסוי עירוני | אפליקציה מתקדמת + AI |
| **Baldar** | משלוחים ארציים | רשת סניפים, נקודות חלוקה | מערכת מסורתית |
| **Mahirli** | שליחויות מהירות | מהירות אספקה, שירות אישי | מערכת בסיסית |
| **רץ פלוס** | שליחויות ולוגיסטיקה | לוגיסטיקה חכמה, טכנולוגיה | מערכת מתקדמת |

### 1.2 מגמות בשוק 2025-2026

- **משלוחים באותו יום (Same-Day)** - ביקוש גובר למשלוחים מהירים
- **לוקרים ונקודות איסוף** - חלופה חסכונית למשלוח עד הבית
- **AI ואופטימיזציית מסלולים** - חיסכון של 20-30% בעלויות תפעול
- **מעקב בזמן אמת** - ציפיות הלקוח לשקיפות מלאה
- **אוטומציה** - מיון אוטומטי, dispatching חכם
- **Green Logistics** - מעבר לרכבים חשמליים, אופטימיזציה סביבתית
- **API-first** - אינטגרציות עם חנויות אונליין ומערכות ERP

### 1.3 ניתוח אתר HFD (מודל ייחוס)

**מה עושים נכון:**
- One-stop-shop לכל סוגי המשלוחים
- תמיכה רב-ערוצית (WhatsApp, טלפון, מייל)
- מעקב חבילות בזמן אמת
- עיצוב רספונסיבי
- נוכחות אזורית (סניפים)

**מה אפשר לשפר:**
- אין הזמנה ישירה ללקוח פרטי
- ממשק ניהול לא חשוף ללקוח
- אין אפליקציה לנהגים
- אין שקיפות מחירים

---

## 2. ארכיטקטורת המערכת הכוללת

### 2.1 סכמת מערכת עילית

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DELIVERY SYSTEM                               │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│  אתר     │  פורטל   │ אפליקציית│  פאנל    │  פורטל   │   API       │
│  שיווקי  │  הזמנות  │  נהגים   │  ניהול   │  ספקים   │  Gateway    │
│ (Public) │(Customer)│ (Driver) │ (Admin)  │(Supplier)│ (External)  │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┤
│                        API Layer (REST + WebSocket)                   │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Auth    │  Orders  │  Fleet   │ Routing  │ Billing  │  Analytics   │
│ Service  │ Service  │ Service  │ Service  │ Service  │  Service     │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┤
│                    Database Layer (PostgreSQL + Redis)                │
├──────────────────────────────────────────────────────────────────────┤
│              Infrastructure (Cloud + CDN + Storage)                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 רכיבי המערכת

1. **אתר שיווקי (Marketing Website)** - אתר חיצוני לשיווק החברה
2. **פורטל הזמנות (Customer Portal)** - הזמנת משלוחים ללקוחות פרטיים ועסקיים
3. **אפליקציית נהגים (Driver App)** - PWA/Native app לנהגים
4. **פאנל ניהול (Admin Dashboard)** - מערכת ניהול מרכזית
5. **פורטל ספקים (Supplier Portal)** - ממשק לספקים/שותפים
6. **API Gateway** - ממשק חיצוני לאינטגרציות

---

## 3. אתר שיווקי (Marketing Website)

### 3.1 מבנה דפים

```
├── דף הבית (Homepage)
│   ├── Hero Section - מסר מרכזי + CTA להזמנה
│   ├── שירותים מרכזיים - כרטיסיות שירות
│   ├── אזורי כיסוי - מפה אינטראקטיבית של הצפון
│   ├── מחשבון מחירים מהיר
│   ├── המלצות לקוחות
│   ├── שותפים וספקים
│   └── CTA תחתון
│
├── שירותים (Services)
│   ├── משלוחים באותו יום
│   ├── משלוחים ליום למחרת
│   ├── משלוחים עסקיים (B2B)
│   ├── משלוחים פרטיים (B2C)
│   ├── שליחויות מיוחדות
│   └── הובלות קטנות
│
├── אזורי שירות (Service Areas)
│   ├── מפה אינטראקטיבית
│   ├── רשימת ערים ויישובים
│   └── זמני הגעה משוערים
│
├── מחירון (Pricing)
│   ├── מחשבון מחירים
│   ├── חבילות עסקיות
│   └── מחירון פרטיים
│
├── מעקב משלוח (Track)
│   ├── חיפוש לפי מספר משלוח
│   ├── מפת מעקב חיה
│   └── היסטוריית סטטוסים
│
├── אודות (About)
│   ├── הסיפור שלנו
│   ├── הצוות
│   ├── ערכים
│   └── אחריות סביבתית
│
├── צור קשר (Contact)
│   ├── טופס יצירת קשר
│   ├── WhatsApp ישיר
│   ├── טלפון
│   └── מפת סניפים
│
├── בלוג (Blog)
│   ├── טיפים למשלוחים
│   ├── חדשות החברה
│   └── מדריכים
│
├── הזמן משלוח (Order) → מפנה לפורטל הזמנות
│
├── כניסת נהגים (Driver Login) → מפנה לאפליקציית נהגים
│
└── כניסת עסקים (Business Login) → מפנה לפורטל ספקים
```

### 3.2 עיצוב ו-UX

- **שפת עיצוב:** מודרנית, נקייה, מקצועית
- **צבעים ראשיים:** כחול/כתום (אמינות + אנרגיה)
- **Typography:** בעברית - Heebo/Assistant, באנגלית - Inter/Poppins
- **RTL מלא** עם תמיכה גם באנגלית (LTR)
- **Mobile-First** - 70%+ מהתנועה מניידים
- **ביצועים:** Lighthouse 90+ בכל הקטגוריות
- **SEO:** מיטוב מלא כולל Schema.org, sitemap, meta tags

---

## 4. פורטל הזמנות ללקוח (Customer Portal)

### 4.1 תהליך הזמנת משלוח

```
שלב 1: הרשמה/כניסה
    ↓
שלב 2: פרטי איסוף
    ├── כתובת איסוף
    ├── שם איש קשר
    ├── טלפון
    └── חלון זמנים מועדף
    ↓
שלב 3: פרטי יעד
    ├── כתובת יעד (עם autocomplete)
    ├── שם מקבל
    ├── טלפון מקבל
    └── הערות מיוחדות
    ↓
שלב 4: פרטי חבילה
    ├── סוג משלוח (מסמכים/חבילה/שברירי)
    ├── משקל משוער
    ├── מידות
    └── ביטוח (אופציונלי)
    ↓
שלב 5: בחירת שירות
    ├── אקספרס (2-4 שעות)
    ├── באותו יום
    ├── יום למחרת
    └── חסכוני (2-3 ימים)
    ↓
שלב 6: סיכום ותשלום
    ├── סיכום הזמנה
    ├── מחיר סופי
    ├── בחירת אמצעי תשלום
    └── אישור הזמנה
    ↓
שלב 7: אישור ומעקב
    ├── מספר הזמנה
    ├── SMS/Email אישור
    └── קישור למעקב חי
```

### 4.2 פיצ'רים ללקוח

- **Dashboard אישי** - סיכום משלוחים, סטטוסים, היסטוריה
- **מעקב בזמן אמת** - מפה חיה עם מיקום השליח
- **הודעות SMS/WhatsApp** - עדכונים אוטומטיים בכל שלב
- **הזמנה חוזרת** - שכפול הזמנות קודמות בלחיצה
- **כתובות שמורות** - ספר כתובות אישי
- **היסטוריית הזמנות** - חיפוש, סינון, הורדת חשבוניות
- **דירוג שליחים** - מערכת דירוג ומשוב
- **תמיכה בצ'אט** - צ'אט חי עם שירות לקוחות

### 4.3 אזורי שירות - הצפון

```
אזורי כיסוי עיקריים:
├── חיפה והקריות
│   ├── חיפה
│   ├── קריית אתא
│   ├── קריית ביאליק
│   ├── קריית מוצקין
│   ├── קריית ים
│   └── נשר
├── עכו-נהריה
│   ├── עכו
│   ├── נהריה
│   └── ישובי הגליל המערבי
├── הגליל
│   ├── כרמיאל
│   ├── מעלות-תרשיחא
│   ├── צפת
│   └── ישובי הגליל העליון
├── העמקים
│   ├── עפולה
│   ├── נצרת
│   ├── נצרת עילית (נוף הגליל)
│   ├── מגדל העמק
│   └── יוקנעם
├── עמק יזרעאל
│   ├── קיבוצים ומושבים
│   └── ישובים כפריים
└── הגולן
    ├── קצרין
    └── ישובי הגולן
```

---

## 5. אפליקציית נהגים (Driver App)

### 5.1 יכולות עיקריות

```
┌────────────────────────────────┐
│       DRIVER APP (PWA)          │
├────────────────────────────────┤
│                                 │
│  📍 ניווט + מסלול אופטימלי     │
│  📋 רשימת משלוחים יומית        │
│  📸 צילום הוכחת מסירה (POD)    │
│  ✍️ חתימה דיגיטלית              │
│  💬 צ'אט עם דיספצ'ר            │
│  📊 סטטיסטיקות אישיות          │
│  🔔 התראות בזמן אמת            │
│  📞 חיוג ישיר ללקוח/מקבל       │
│                                 │
├────────────────────────────────┤
│  שליחת מיקום GPS רציפה         │
│  עבודה במצב Offline            │
│  סריקת ברקוד/QR                │
│  דיווח בעיות                   │
└────────────────────────────────┘
```

### 5.2 מסכים עיקריים

1. **Login** - כניסה עם מספר טלפון + OTP
2. **Dashboard** - סיכום יומי (משלוחים, רווחים, ביצועים)
3. **Task List** - רשימת משלוחים ממוינת לפי מסלול אופטימלי
4. **Navigation** - מפת ניווט משולבת (Google Maps / Waze integration)
5. **Pickup** - מסך איסוף חבילה (סריקה + אישור)
6. **Delivery** - מסך מסירה (חתימה + צילום + אישור)
7. **Chat** - תקשורת עם המשרד
8. **Earnings** - דוח רווחים והכנסות
9. **Profile** - פרטים אישיים, רכב, מסמכים

### 5.3 GPS Tracking

- שליחת מיקום כל 10-30 שניות (configurable)
- אופטימיזציה: שליחה בתדירות גבוהה רק בזמן נסיעה
- Battery optimization - מצב חיסכון כשהאפליקציה ברקע
- Offline queue - שמירת מיקומים כשאין חיבור ושליחה בחזרה

---

## 6. פאנל ניהול (Admin Dashboard)

### 6.1 מודולים

```
┌──────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                            │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│ Dashboard│  Orders  │  Fleet   │ Finance  │    Settings      │
│  ראשי   │  הזמנות  │  צי רכב  │  כספים   │    הגדרות       │
├──────────┴──────────┴──────────┴──────────┴──────────────────┤
│                                                               │
│  📊 DASHBOARD ראשי                                           │
│  ├── סטטיסטיקות חיות (משלוחים פעילים, ממתינים, הושלמו)      │
│  ├── מפה חיה - מיקום כל הנהגים בזמן אמת                    │
│  ├── גרפים - ביצועים יומיים/שבועיים/חודשיים                │
│  ├── התראות דחופות                                           │
│  └── KPIs מרכזיים                                            │
│                                                               │
│  📦 ניהול הזמנות                                              │
│  ├── רשימת הזמנות (סינון, חיפוש, מיון)                     │
│  ├── הזמנה חדשה ידנית                                        │
│  ├── שיבוץ נהגים (ידני/אוטומטי)                             │
│  ├── עדכון סטטוסים                                           │
│  ├── ניהול החזרות                                             │
│  └── ייצוא דוחות                                              │
│                                                               │
│  🚗 ניהול צי רכב                                              │
│  ├── מפת נהגים חיה (GPS real-time)                           │
│  ├── רשימת נהגים + סטטוס                                    │
│  ├── שיבוץ אזורים                                            │
│  ├── ביצועי נהגים                                             │
│  ├── ניהול רכבים                                              │
│  └── תכנון מסלולים                                            │
│                                                               │
│  💰 ניהול כספים                                                │
│  ├── הכנסות ותשלומים                                          │
│  ├── חשבוניות                                                 │
│  ├── עמלות נהגים                                              │
│  ├── חיובי ספקים                                              │
│  └── דוחות כספיים                                              │
│                                                               │
│  🔗 ניהול ספקים                                                │
│  ├── רשימת ספקים                                              │
│  ├── הזמנות מספקים                                            │
│  ├── SLA tracking                                             │
│  └── חיובים הדדיים                                            │
│                                                               │
│  ⚙️ הגדרות                                                    │
│  ├── אזורי שירות                                              │
│  ├── מחירון                                                   │
│  ├── הרשאות משתמשים                                           │
│  ├── הגדרות SMS/WhatsApp                                      │
│  ├── אינטגרציות                                               │
│  └── הגדרות כלליות                                            │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 מפת נהגים בזמן אמת

```
Features:
- הצגת מיקום כל הנהגים על מפה אינטראקטיבית
- סטטוס נהג: פנוי / בדרך לאיסוף / בדרך למסירה / בהפסקה
- צבע אייקון לפי סטטוס
- לחיצה על נהג → פרטי נהג + משלוחים + מסלול
- Heat map של אזורי ביקוש
- ETA חי לכל משלוח
- התראות על חריגות (עיכובים, סטיות ממסלול)
```

### 6.3 שיבוץ חכם (Smart Dispatch)

- **שיבוץ אוטומטי** - אלגוריתם שמתחשב במיקום, עומס, אזור, סוג רכב
- **Drag & Drop** - שיבוץ ידני על לוח גאנט
- **אופטימיזציית מסלולים** - חישוב המסלול הקצר ביותר
- **Load Balancing** - חלוקה שווה בין נהגים
- **Priority Queue** - עדיפות למשלוחים דחופים

---

## 7. פורטל ספקים (Supplier Portal)

### 7.1 יכולות

- **Dashboard ספק** - סיכום משלוחים, סטטוסים, עלויות
- **הזמנת משלוח** - יצירת הזמנות ישירות מהספק
- **API Integration** - חיבור אוטומטי למערכת הספק
- **Webhook notifications** - עדכונים אוטומטיים לסטטוס
- **דוחות** - דוחות חודשיים, חשבוניות
- **Label Printing** - הדפסת מדבקות משלוח
- **CSV Import** - ייבוא הזמנות מקובץ

### 7.2 אינטגרציות ספקים

```
ספקים / שותפים אפשריים:
├── חנויות אונליין (Shopify, WooCommerce, etc.)
├── ספקי מזון ומשקאות
├── חנויות רשת קמעונאיות
├── בתי עסק מקומיים בצפון
├── חברות משלוחים אחרות (sub-contracting)
└── מחסנים ומרכזי הפצה
```

---

## 8. Tech Stack - מחסנית טכנולוגית

### 8.1 Frontend

| רכיב | טכנולוגיה | סיבה |
|------|-----------|------|
| **Framework** | Next.js 15 (App Router) | SSR, SEO, ביצועים, React ecosystem |
| **UI Library** | Tailwind CSS + shadcn/ui | עיצוב מהיר, customizable, RTL support |
| **State Management** | Zustand | קל, פשוט, ביצועים טובים |
| **Forms** | React Hook Form + Zod | ולידציה חזקה, ביצועים |
| **Maps** | Mapbox GL / Leaflet | מפות אינטראקטיביות, GPS tracking |
| **Real-time** | Socket.IO Client | WebSocket לעדכונים חיים |
| **Charts** | Recharts | גרפים ודוחות |
| **i18n** | next-intl | תמיכה בעברית + RTL + אנגלית |
| **Driver App** | React Native / PWA | חוויה native-like, GPS background |

### 8.2 Backend

| רכיב | טכנולוגיה | סיבה |
|------|-----------|------|
| **Runtime** | Node.js 22+ | אקוסיסטם JS, real-time, async |
| **Framework** | Fastify / Express.js | ביצועים, middleware ecosystem |
| **API** | REST + WebSocket (Socket.IO) | REST למידע, WS לעדכונים חיים |
| **Auth** | NextAuth.js + JWT | הזדהות מאובטחת, OAuth |
| **ORM** | Prisma | Type-safe, migrations, query builder |
| **Validation** | Zod | Schema validation shared with frontend |
| **File Upload** | Multer + S3 | תמונות הוכחת מסירה, מסמכים |
| **Email** | Nodemailer + SendGrid | חשבוניות, עדכונים |
| **SMS** | Twilio / SMS4Free (IL) | SMS ישראלי |
| **WhatsApp** | WhatsApp Business API | הודעות ללקוחות |
| **Queue** | BullMQ (Redis) | ניהול תורים ועבודות רקע |
| **Cron Jobs** | node-cron | משימות תזמון |

### 8.3 Database & Storage

| רכיב | טכנולוגיה | סיבה |
|------|-----------|------|
| **Primary DB** | PostgreSQL 16 | ACID, PostGIS לגיאוגרפיה, אמינות |
| **Cache** | Redis | Session, caching, real-time pub/sub |
| **Search** | PostgreSQL Full-Text / Meilisearch | חיפוש מהיר |
| **File Storage** | AWS S3 / Cloudflare R2 | תמונות, מסמכים, גיבויים |
| **Geospatial** | PostGIS | חישובי מרחק, אזורי שירות, routing |

### 8.4 Infrastructure

| רכיב | טכנולוגיה | סיבה |
|------|-----------|------|
| **Hosting** | Vercel (Frontend) + Railway/Render (Backend) | Deploy קל, scaling |
| **Alternative** | AWS (EC2 + RDS + S3) | שליטה מלאה, scaling enterprise |
| **CDN** | Cloudflare | מהירות, אבטחה, DDoS protection |
| **CI/CD** | GitHub Actions | אוטומציה, testing, deployment |
| **Monitoring** | Sentry + Grafana | שגיאות, ביצועים, logs |
| **Container** | Docker + Docker Compose | פיתוח מקומי, consistency |

### 8.5 שירותי צד שלישי

| רכיב | טכנולוגיה | סיבה |
|------|-----------|------|
| **Maps & Geocoding** | Google Maps Platform / Mapbox | מפות, geocoding, routing |
| **Route Optimization** | Google Routes API / OSRM | אופטימיזציית מסלולים |
| **Payments** | Stripe / PayPlus (IL) / Meshulam | תשלומים בישראל |
| **SMS** | Twilio / InforUMobile | SMS ישראלי |
| **WhatsApp** | Twilio WhatsApp / Green API | הודעות WhatsApp |
| **Analytics** | Google Analytics 4 + Mixpanel | ניתוח התנהגות |
| **Notifications** | Firebase Cloud Messaging | Push notifications |

---

## 9. מודל נתונים (Database Schema)

### 9.1 טבלאות עיקריות

```sql
-- משתמשים
users
├── id (UUID, PK)
├── email (unique)
├── phone (unique)
├── password_hash
├── full_name
├── role (admin, dispatcher, driver, customer, supplier)
├── avatar_url
├── is_active
├── created_at
└── updated_at

-- לקוחות
customers
├── id (UUID, PK)
├── user_id (FK → users)
├── customer_type (private, business)
├── company_name
├── company_id (ח.פ.)
├── billing_address
├── default_payment_method
├── notes
└── credit_balance

-- נהגים
drivers
├── id (UUID, PK)
├── user_id (FK → users)
├── license_number
├── vehicle_id (FK → vehicles)
├── zone_id (FK → zones)
├── status (available, busy, on_break, offline)
├── current_lat
├── current_lng
├── last_location_update
├── rating_avg
├── total_deliveries
└── is_verified

-- רכבים
vehicles
├── id (UUID, PK)
├── plate_number
├── type (motorcycle, car, van, truck)
├── model
├── year
├── max_weight_kg
├── max_volume_m3
├── is_active
└── insurance_expiry

-- הזמנות
orders
├── id (UUID, PK)
├── order_number (unique, readable)
├── customer_id (FK → customers)
├── driver_id (FK → drivers, nullable)
├── supplier_id (FK → suppliers, nullable)
├── status (pending, confirmed, assigned, picked_up, in_transit, delivered, cancelled, returned)
├── service_type (express, same_day, next_day, economy)
├── pickup_address
├── pickup_lat
├── pickup_lng
├── pickup_contact_name
├── pickup_contact_phone
├── pickup_time_window_start
├── pickup_time_window_end
├── delivery_address
├── delivery_lat
├── delivery_lng
├── delivery_contact_name
├── delivery_contact_phone
├── delivery_time_window_start
├── delivery_time_window_end
├── package_type (documents, package, fragile, heavy)
├── package_weight_kg
├── package_dimensions
├── package_description
├── special_instructions
├── estimated_price
├── final_price
├── payment_status (pending, paid, refunded)
├── payment_method
├── insurance_amount
├── pod_image_url (proof of delivery)
├── pod_signature_url
├── delivered_at
├── cancelled_at
├── cancellation_reason
├── rating
├── feedback
├── created_at
└── updated_at

-- עדכוני סטטוס
order_status_history
├── id (UUID, PK)
├── order_id (FK → orders)
├── status
├── notes
├── lat
├── lng
├── updated_by (FK → users)
└── created_at

-- אזורי שירות
zones
├── id (UUID, PK)
├── name
├── polygon (PostGIS GEOMETRY)
├── base_price
├── price_per_km
├── is_active
└── max_delivery_time_hours

-- ספקים
suppliers
├── id (UUID, PK)
├── user_id (FK → users)
├── company_name
├── company_id
├── contact_name
├── contact_phone
├── address
├── api_key
├── webhook_url
├── pricing_tier
├── is_active
└── created_at

-- מיקומי נהגים (טבלת tracking)
driver_locations
├── id (BIGSERIAL, PK)
├── driver_id (FK → drivers)
├── lat
├── lng
├── speed
├── heading
├── accuracy
├── battery_level
├── recorded_at
└── (PARTITION BY recorded_at -- partitioned by date for performance)

-- תשלומים
payments
├── id (UUID, PK)
├── order_id (FK → orders)
├── amount
├── currency (ILS)
├── method (credit_card, bank_transfer, cash)
├── status (pending, completed, failed, refunded)
├── gateway_transaction_id
├── paid_at
└── created_at

-- כתובות שמורות
saved_addresses
├── id (UUID, PK)
├── customer_id (FK → customers)
├── label (בית, עבודה, etc.)
├── address
├── lat
├── lng
├── contact_name
├── contact_phone
└── is_default

-- מחירון
pricing_rules
├── id (UUID, PK)
├── name
├── zone_from_id (FK → zones)
├── zone_to_id (FK → zones)
├── service_type
├── base_price
├── price_per_km
├── price_per_kg
├── min_price
├── max_price
├── surge_multiplier
├── is_active
├── valid_from
└── valid_until

-- הודעות והתראות
notifications
├── id (UUID, PK)
├── user_id (FK → users)
├── type (sms, whatsapp, push, email)
├── title
├── message
├── data (JSONB)
├── is_read
├── sent_at
└── created_at
```

---

## 10. API Endpoints

### 10.1 Auth API
```
POST   /api/auth/register          -- הרשמת משתמש חדש
POST   /api/auth/login             -- התחברות
POST   /api/auth/logout            -- התנתקות
POST   /api/auth/refresh           -- חידוש token
POST   /api/auth/forgot-password   -- שכחתי סיסמה
POST   /api/auth/verify-otp        -- אימות OTP (נהגים)
```

### 10.2 Orders API
```
GET    /api/orders                  -- רשימת הזמנות (עם סינון)
POST   /api/orders                  -- יצירת הזמנה חדשה
GET    /api/orders/:id              -- פרטי הזמנה
PATCH  /api/orders/:id              -- עדכון הזמנה
DELETE /api/orders/:id              -- ביטול הזמנה
PATCH  /api/orders/:id/status       -- עדכון סטטוס
POST   /api/orders/:id/assign       -- שיבוץ נהג
GET    /api/orders/:id/tracking     -- מעקב הזמנה (public)
POST   /api/orders/:id/pod          -- העלאת הוכחת מסירה
POST   /api/orders/calculate-price  -- חישוב מחיר
POST   /api/orders/bulk-import      -- ייבוא הזמנות (CSV)
```

### 10.3 Drivers API
```
GET    /api/drivers                 -- רשימת נהגים
GET    /api/drivers/:id             -- פרטי נהג
PATCH  /api/drivers/:id/status      -- עדכון סטטוס נהג
POST   /api/drivers/:id/location    -- עדכון מיקום
GET    /api/drivers/:id/tasks       -- משימות נהג
GET    /api/drivers/:id/earnings    -- רווחי נהג
GET    /api/drivers/locations        -- כל מיקומי הנהגים (admin)
```

### 10.4 Customers API
```
GET    /api/customers               -- רשימת לקוחות
GET    /api/customers/:id           -- פרטי לקוח
GET    /api/customers/:id/orders    -- הזמנות לקוח
POST   /api/customers/:id/addresses -- הוספת כתובת
```

### 10.5 Suppliers API
```
GET    /api/suppliers               -- רשימת ספקים
POST   /api/suppliers               -- הוספת ספק
GET    /api/suppliers/:id/orders    -- הזמנות ספק
POST   /api/suppliers/webhook       -- webhook endpoint
```

### 10.6 Analytics API
```
GET    /api/analytics/dashboard     -- נתוני dashboard
GET    /api/analytics/orders        -- סטטיסטיקות הזמנות
GET    /api/analytics/drivers       -- ביצועי נהגים
GET    /api/analytics/revenue       -- דוחות הכנסה
GET    /api/analytics/zones         -- ניתוח אזורי
```

### 10.7 WebSocket Events
```
-- Server → Client
driver:location_update    -- עדכון מיקום נהג
order:status_changed      -- שינוי סטטוס הזמנה
order:assigned            -- שיבוץ נהג להזמנה
notification:new          -- התראה חדשה
driver:eta_update         -- עדכון ETA

-- Client → Server
driver:update_location    -- נהג שולח מיקום
driver:update_status      -- נהג משנה סטטוס
order:update_status       -- עדכון סטטוס הזמנה
```

---

## 11. אבטחה (Security)

### 11.1 Authentication & Authorization
- JWT tokens עם refresh rotation
- Role-Based Access Control (RBAC)
- OTP עבור נהגים (SMS-based login)
- Rate limiting על כל ה-endpoints
- CORS configuration

### 11.2 Data Protection
- HTTPS everywhere (TLS 1.3)
- Encryption at rest (AES-256)
- Password hashing (bcrypt/argon2)
- Input sanitization (XSS, SQL injection)
- CSRF protection
- Helmet.js security headers

### 11.3 API Security
- API Key authentication לספקים
- Request signing לwebhooks
- IP whitelisting (optional)
- Rate limiting per user/IP
- Request size limits

---

## 12. תכנון פיתוח (Development Roadmap)

### Phase 1 - MVP (שבועות 1-6)
```
✅ Setup & Infrastructure
   ├── Project scaffolding (Next.js + Fastify)
   ├── Database setup (PostgreSQL + Prisma)
   ├── Authentication system
   └── CI/CD pipeline

✅ Marketing Website
   ├── דף הבית
   ├── שירותים
   ├── אודות
   ├── צור קשר
   └── מעקב משלוח בסיסי

✅ Customer Portal (Basic)
   ├── הרשמה/כניסה
   ├── הזמנת משלוח (תהליך מלא)
   ├── מעקב הזמנה
   └── היסטוריית הזמנות

✅ Admin Dashboard (Basic)
   ├── רשימת הזמנות
   ├── שיבוץ נהגים ידני
   ├── מפת נהגים בסיסית
   └── ניהול משתמשים
```

### Phase 2 - Core Features (שבועות 7-12)
```
✅ Driver App (PWA)
   ├── Login + task list
   ├── GPS tracking
   ├── Proof of delivery
   ├── Navigation integration
   └── Status updates

✅ Real-time Tracking
   ├── WebSocket infrastructure
   ├── Live map (Admin)
   ├── Customer tracking page
   └── ETA calculations

✅ Smart Dispatch
   ├── אלגוריתם שיבוץ אוטומטי
   ├── Route optimization
   └── Load balancing
```

### Phase 3 - Advanced Features (שבועות 13-18)
```
✅ Supplier Portal
   ├── Supplier dashboard
   ├── API integration
   ├── Webhook system
   └── Bulk order import

✅ Financial Module
   ├── Online payments (credit card)
   ├── Invoice generation
   ├── Driver payroll
   └── Financial reports

✅ Communication
   ├── SMS notifications
   ├── WhatsApp integration
   ├── Push notifications
   └── Email templates
```

### Phase 4 - Polish & Scale (שבועות 19-24)
```
✅ Analytics & Reports
   ├── Dashboard KPIs
   ├── Performance analytics
   ├── Revenue reports
   └── Custom reports

✅ Advanced Features
   ├── Pricing engine (dynamic pricing)
   ├── Rating system
   ├── Blog/Content
   ├── SEO optimization
   └── A/B testing

✅ Performance & Scale
   ├── Load testing
   ├── Database optimization
   ├── Caching strategy
   ├── CDN configuration
   └── Monitoring & alerting
```

---

## 13. מערכת הזמנות לשוק הפרטי - אפיון מפורט

### 13.1 חוויית משתמש (Customer Journey)

```
כניסה לאתר
    │
    ├── [ללא הרשמה] → מחשבון מחירים מהיר
    │   └── הזן: מאיפה → לאיפה → סוג חבילה → קבל מחיר
    │
    └── [עם הרשמה] → הזמנת משלוח מלאה
        │
        ├── Step 1: מאיפה? (כתובת איסוף)
        │   ├── Google Places Autocomplete (בעברית)
        │   ├── בחירה מכתובות שמורות
        │   ├── סימון על מפה
        │   └── שם + טלפון איש קשר
        │
        ├── Step 2: לאיפה? (כתובת יעד)
        │   ├── Google Places Autocomplete
        │   ├── בדיקה שהיעד באזור שירות
        │   └── שם + טלפון מקבל
        │
        ├── Step 3: מה שולחים?
        │   ├── סוג: מסמכים / חבילה קטנה / חבילה / שברירי
        │   ├── משקל: עד 5 ק"ג / 5-15 / 15-30 / 30+
        │   └── תיאור + הערות
        │
        ├── Step 4: מתי?
        │   ├── אקספרס 2-4 שעות (₪XX)
        │   ├── היום עד הערב (₪XX)
        │   ├── מחר (₪XX)
        │   ├── תוך 2-3 ימים (₪XX)
        │   └── בחירת חלון זמנים מועדף
        │
        ├── Step 5: סיכום ותשלום
        │   ├── סיכום כל הפרטים
        │   ├── מחיר סופי כולל מע"מ
        │   ├── קוד קופון (אופציונלי)
        │   ├── כרטיס אשראי / Apple Pay / Google Pay
        │   └── אישור תנאי שימוש
        │
        └── Step 6: אישור!
            ├── מספר הזמנה
            ├── SMS אישור ללקוח + למקבל
            ├── ETA משוער
            └── קישור למעקב חי
```

### 13.2 מחשבון מחירים

```
גורמים לחישוב מחיר:
├── מרחק (km) - חישוב PostGIS
├── סוג שירות (אקספרס/רגיל/חסכוני)
├── משקל חבילה
├── סוג חבילה (שברירי = תוספת)
├── זמן ביקוש (surge pricing בשעות עומס)
├── אזור (כפרי = תוספת)
└── ביטוח (אופציונלי)

נוסחה בסיסית:
price = base_price + (distance_km × price_per_km) + weight_surcharge + type_surcharge
price *= surge_multiplier (if applicable)
price += insurance (if selected)
price *= 1.17 (VAT)
```

### 13.3 מערכת מעקב ללקוח

```
דף מעקב (נגיש ללא login):

┌─────────────────────────────────────┐
│  📦 מעקב משלוח #DEL-2026-001234    │
├─────────────────────────────────────┤
│                                      │
│  ⬤ הזמנה התקבלה      10:00         │
│  │                                   │
│  ⬤ שליח מוקצה        10:15         │
│  │  🚗 יוסי כ. | ⭐ 4.8            │
│  │                                   │
│  ⬤ בדרך לאיסוף       10:20         │
│  │  ETA: 10 דקות                    │
│  │                                   │
│  ◉ נאסף!              10:32         │
│  │                                   │
│  ○ בדרך אליך...                     │
│  │  ETA: 25 דקות                    │
│  │                                   │
│  ○ נמסר                              │
│                                      │
│  ┌─────────────────────────────┐    │
│  │      [מפה חיה + מיקום       │    │
│  │       השליח בזמן אמת]      │    │
│  └─────────────────────────────┘    │
│                                      │
│  📞 צור קשר עם השליח               │
│  💬 צ'אט עם שירות לקוחות           │
│                                      │
└─────────────────────────────────────┘
```

---

## 14. אינטגרציות מערכת

### 14.1 אינטגרציות נדרשות

```
┌─────────────────────────────────────────────┐
│              INTEGRATIONS MAP                │
├─────────────────────────────────────────────┤
│                                              │
│  Maps & Location                             │
│  ├── Google Maps Platform (maps, geocoding)  │
│  ├── Google Routes API (routing, ETA)        │
│  └── Waze Deep Links (driver navigation)     │
│                                              │
│  Payments                                    │
│  ├── PayPlus / Meshulam (IL credit cards)    │
│  ├── Apple Pay / Google Pay                  │
│  └── Invoice generation (Green Invoice)      │
│                                              │
│  Communication                               │
│  ├── Twilio / InforUMobile (SMS)             │
│  ├── WhatsApp Business API                   │
│  ├── SendGrid (Email)                        │
│  └── Firebase (Push Notifications)           │
│                                              │
│  E-commerce                                  │
│  ├── Shopify API                             │
│  ├── WooCommerce API                         │
│  ├── Custom API (webhook-based)              │
│  └── CSV/Excel import                        │
│                                              │
│  Accounting                                  │
│  ├── Green Invoice / iCount                  │
│  └── חשבשבת / SAP (future)                   │
│                                              │
│  Analytics                                   │
│  ├── Google Analytics 4                      │
│  ├── Mixpanel                                │
│  └── Sentry (error tracking)                 │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 15. KPIs ומדדים

### 15.1 מדדי ביצוע עיקריים

```
תפעולי:
├── זמן מסירה ממוצע
├── אחוז מסירה בזמן (On-Time Delivery Rate)
├── אחוז משלוחים שנכשלו
├── אחוז החזרות
├── משלוחים ליום / לנהג
└── זמן תגובה ממוצע

כספי:
├── הכנסה יומית / חודשית
├── עלות למשלוח
├── רווח גולמי
├── ערך הזמנה ממוצע
└── CAC (Customer Acquisition Cost)

שביעות רצון:
├── דירוג ממוצע
├── NPS (Net Promoter Score)
├── אחוז לקוחות חוזרים
└── זמן תגובה לפניות
```

---

## 16. סיכום טכנולוגי

### Stack מומלץ סופי

```
Frontend:  Next.js 15 + Tailwind + shadcn/ui + Mapbox
Backend:   Node.js + Fastify + Prisma + Socket.IO
Database:  PostgreSQL (PostGIS) + Redis
Mobile:    React Native (driver app) OR PWA
Cloud:     Vercel + Railway + Cloudflare + AWS S3
Payments:  PayPlus (IL) + Stripe
Maps:      Google Maps Platform + OSRM
Comms:     Twilio (SMS) + WhatsApp API + SendGrid
```

### יתרונות Stack זה:

1. **Full-Stack JavaScript** - צוות אחד, שפה אחת
2. **Next.js SSR** - SEO מצוין לאתר שיווקי
3. **Real-time מובנה** - Socket.IO + Redis Pub/Sub
4. **PostGIS** - חישובי גיאוגרפיה מובנים ב-DB
5. **Type-safe** - TypeScript E2E עם Zod + Prisma
6. **סקיילינג** - מתחיל קטן, גדל בקלות
7. **אקוסיסטם** - ספריות ומשאבים רבים
8. **עלות** - עלות נמוכה להתחלה (Vercel free tier + Railway)

---

## מקורות ומשאבים

- [HFD](https://www.hfd.co.il) - מודל ייחוס
- [LionWheel](https://www.lionwheel.com/en/home) - מערכת ניהול משלוחים ישראלית
- [PickPack](https://pickpackage.com/) - תוכנה לניהול משלוחים
- [Tictruck](https://tictruck.io/) - תוכנה לניהול משלוחים
- [Onfleet](https://onfleet.com/) - Last mile delivery software
- [Deliforce](https://www.deliforce.io/) - Fleet management
- [FarEye](https://fareye.com/) - Last mile delivery
- [DispatchTrack](https://www.dispatchtrack.com/) - Delivery management
- [Cargo](https://cargo.co.il/) - חברת שליחויות ישראלית
- [רץ פלוס](https://www.ratz.co.il/) - לוגיסטיקה חכמה
- [Techstack - Logistics Software Guide](https://tech-stack.com/blog/how-to-build-a-logistics-management-software/)
- [Wolt Israel](https://explore.wolt.com/en/isr/about)

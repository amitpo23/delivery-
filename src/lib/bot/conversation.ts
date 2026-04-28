/**
 * Bot conversation state machine — pure, no IO.
 *
 * Both the Telegram and WhatsApp webhooks load a session from
 * `bot_sessions` (channel + external_id), pass the user's incoming text
 * here along with the session state, and then persist the returned state
 * back to the DB plus send the returned replies to the user.
 *
 * Step 0 collects everything we need to deep-link the user into the
 * existing /booking page: addresses, package size, urgency, and contact
 * details. The bot itself never asks for credit card data — Green API and
 * Telegram are not PCI-compliant, and routing the user to the web for
 * payment is the standard pattern.
 */

import { resolveZone } from "@/lib/pricing/zones";

export type BotState =
  | "idle"
  | "menu"
  | "pickup_address"
  | "delivery_address"
  | "size"
  | "urgency"
  | "booker_name"
  | "pickup_phone"
  | "delivery_phone"
  | "confirm"
  | "done";

export type Size = "S" | "M" | "L" | "XL";
export type Urgency = "express" | "same_day" | "next_day" | "economy";

export interface BotData {
  pickupAddress?: string;
  deliveryAddress?: string;
  size?: Size;
  urgency?: Urgency;
  bookerName?: string;
  pickupPhone?: string;
  deliveryPhone?: string;
  trackingNumber?: string; // for the "track" branch
}

export interface BotInput {
  state: BotState;
  data: BotData;
  message: string;
}

export interface BotOutput {
  newState: BotState;
  newData: BotData;
  replies: string[];
  /** When the conversation reaches `done`, this is the deep-link to /booking. */
  prefillUrl?: string;
  /** When the user picked the "track" branch, this is the tracking page URL. */
  trackingUrl?: string;
}

const SIZE_OPTIONS: Array<{ key: string; size: Size; label: string }> = [
  { key: "1", size: "S", label: "1) קטנה — עד 5 ק\"ג" },
  { key: "2", size: "M", label: "2) בינונית — 5-15 ק\"ג" },
  { key: "3", size: "L", label: "3) גדולה — 15-30 ק\"ג" },
  { key: "4", size: "XL", label: "4) גדולה מאוד — מעל 30 ק\"ג" },
];

const URGENCY_OPTIONS: Array<{ key: string; urgency: Urgency; label: string }> = [
  { key: "1", urgency: "express", label: "1) אקספרס (2-4 שעות)" },
  { key: "2", urgency: "same_day", label: "2) באותו יום" },
  { key: "3", urgency: "next_day", label: "3) יום למחרת" },
  { key: "4", urgency: "economy", label: "4) חסכון" },
];

const TRACKING_REGEX = /^DEL-[A-Z0-9-]+$/i;

/**
 * Strip whitespace, dashes, parens and validate it's an Israeli mobile/landline
 * (10 or 9 digits starting with 0). Returns the normalized form or null.
 */
function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (/^0\d{8,9}$/.test(digits)) return digits;
  return null;
}

const WELCOME = [
  "שלום וברוכים הבאים לאליהב כהן משלוחים 📦",
  "מה תרצו לעשות?",
  "1) הזמנה חדשה",
  "2) מעקב אחרי הזמנה קיימת",
  "(שלחו 'בטל' בכל שלב כדי להתחיל מחדש)",
];

function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://delivery-rosy-gamma.vercel.app";
}

function reset(message: string): BotOutput {
  return {
    newState: "menu",
    newData: {},
    replies: [message, "", ...WELCOME],
  };
}

export function handle(input: BotInput): BotOutput {
  const text = (input.message ?? "").trim();
  const lower = text.toLowerCase();

  if (lower === "בטל" || lower === "cancel" || lower === "/start" || lower === "/restart") {
    return reset("התחלנו מחדש 🔄");
  }

  switch (input.state) {
    case "idle": {
      return {
        newState: "menu",
        newData: {},
        replies: WELCOME,
      };
    }

    case "menu": {
      if (text === "1" || lower.includes("הזמנה")) {
        return {
          newState: "pickup_address",
          newData: {},
          replies: ["מעולה! מאיזו כתובת לאסוף את החבילה?", "(עיר ורחוב)"],
        };
      }
      if (text === "2" || lower.includes("מעקב")) {
        return {
          newState: "idle",
          newData: { ...input.data, trackingNumber: undefined },
          replies: ["שלחו את מספר ההזמנה (DEL-XXXX)"],
        };
      }
      // If they typed a tracking number directly
      if (TRACKING_REGEX.test(text)) {
        return {
          newState: "idle",
          newData: {},
          replies: [`הנה קישור למעקב:\n${siteBase()}/track/${text.toUpperCase()}`],
          trackingUrl: `${siteBase()}/track/${text.toUpperCase()}`,
        };
      }
      return {
        newState: "menu",
        newData: input.data,
        replies: ["לא הבנתי. שלחו 1 (הזמנה חדשה) או 2 (מעקב).", ...WELCOME],
      };
    }

    case "pickup_address": {
      if (text.length < 3) {
        return {
          newState: "pickup_address",
          newData: input.data,
          replies: ["הכתובת קצרה מדי. שלחו עיר ורחוב."],
        };
      }
      if (!resolveZone(text)) {
        return {
          newState: "pickup_address",
          newData: input.data,
          replies: [
            "הכתובת מחוץ לאזור הכיסוי שלנו 😕",
            "אנחנו פועלים ב: חיפה, מ\"א מגידו, מ\"א גלבוע, בקעת בית שאן, עפולה והתענכים.",
            "שלחו כתובת אחרת או 'בטל' לחזרה לתפריט.",
          ],
        };
      }
      return {
        newState: "delivery_address",
        newData: { ...input.data, pickupAddress: text },
        replies: ["מצוין. ולאן למסור?", "(עיר ורחוב)"],
      };
    }

    case "delivery_address": {
      if (text.length < 3) {
        return {
          newState: "delivery_address",
          newData: input.data,
          replies: ["הכתובת קצרה מדי. שלחו עיר ורחוב."],
        };
      }
      if (!resolveZone(text)) {
        return {
          newState: "delivery_address",
          newData: input.data,
          replies: [
            "כתובת המסירה מחוץ לאזור הכיסוי 😕",
            "אנחנו פועלים ב: חיפה, מ\"א מגידו, מ\"א גלבוע, בקעת בית שאן, עפולה והתענכים.",
          ],
        };
      }
      return {
        newState: "size",
        newData: { ...input.data, deliveryAddress: text },
        replies: ["מה גודל החבילה?", ...SIZE_OPTIONS.map((o) => o.label)],
      };
    }

    case "size": {
      const match = SIZE_OPTIONS.find((o) => o.key === text);
      if (!match) {
        return {
          newState: "size",
          newData: input.data,
          replies: ["שלחו 1, 2, 3 או 4.", ...SIZE_OPTIONS.map((o) => o.label)],
        };
      }
      return {
        newState: "urgency",
        newData: { ...input.data, size: match.size },
        replies: ["מתי צריך שיגיע?", ...URGENCY_OPTIONS.map((o) => o.label)],
      };
    }

    case "urgency": {
      const match = URGENCY_OPTIONS.find((o) => o.key === text);
      if (!match) {
        return {
          newState: "urgency",
          newData: input.data,
          replies: ["שלחו 1, 2, 3 או 4.", ...URGENCY_OPTIONS.map((o) => o.label)],
        };
      }
      return {
        newState: "booker_name",
        newData: { ...input.data, urgency: match.urgency },
        replies: ["שלחו את שמכם המלא (זה יופיע על ההזמנה)."],
      };
    }

    case "booker_name": {
      if (text.length < 2) {
        return {
          newState: "booker_name",
          newData: input.data,
          replies: ["שם קצר מדי. נסו שוב."],
        };
      }
      return {
        newState: "pickup_phone",
        newData: { ...input.data, bookerName: text },
        replies: ["טלפון של נקודת האיסוף?"],
      };
    }

    case "pickup_phone": {
      const pNormPickup = normalizePhone(text);
      if (!pNormPickup) {
        return {
          newState: "pickup_phone",
          newData: input.data,
          replies: ["מספר לא תקין. דוגמה: 050-1234567"],
        };
      }
      return {
        newState: "delivery_phone",
        newData: { ...input.data, pickupPhone: pNormPickup },
        replies: ["טלפון של נקודת המסירה?"],
      };
    }

    case "delivery_phone": {
      const pNormDelivery = normalizePhone(text);
      if (!pNormDelivery) {
        return {
          newState: "delivery_phone",
          newData: input.data,
          replies: ["מספר לא תקין. דוגמה: 050-1234567"],
        };
      }
      const next = { ...input.data, deliveryPhone: pNormDelivery };
      const summary = buildSummary(next);
      return {
        newState: "confirm",
        newData: next,
        replies: [
          "מעולה! הנה סיכום:",
          "",
          ...summary,
          "",
          "לאישור — שלחו 'כן' (לשינוי שלחו 'בטל').",
        ],
      };
    }

    case "confirm": {
      if (lower !== "כן" && lower !== "yes" && lower !== "y") {
        return {
          newState: "confirm",
          newData: input.data,
          replies: ["שלחו 'כן' לאישור או 'בטל' להתחלה מחדש."],
        };
      }
      const url = buildPrefillUrl(input.data);
      return {
        newState: "done",
        newData: input.data,
        replies: [
          "מצוין! 🎉",
          "להשלמת ההזמנה בתשלום מאובטח, היכנסו לקישור:",
          url,
          "",
          "הקישור פתוח ל-30 דקות. כל השדות מולאו מראש.",
        ],
        prefillUrl: url,
      };
    }

    case "done": {
      // After completion treat any new message as a fresh start.
      return reset("התחלת הזמנה חדשה. ההזמנה הקודמת ממתינה לתשלום בקישור שנשלח.");
    }
  }
}

function buildSummary(data: BotData): string[] {
  const sizeLabel = SIZE_OPTIONS.find((o) => o.size === data.size)?.label ?? "—";
  const urgencyLabel = URGENCY_OPTIONS.find((o) => o.urgency === data.urgency)?.label ?? "—";
  return [
    `📍 איסוף: ${data.pickupAddress ?? "—"}`,
    `📍 מסירה: ${data.deliveryAddress ?? "—"}`,
    `📦 ${sizeLabel}`,
    `⏱  ${urgencyLabel}`,
    `👤 ${data.bookerName ?? "—"}`,
    `☎️ איסוף: ${data.pickupPhone ?? "—"}`,
    `☎️ מסירה: ${data.deliveryPhone ?? "—"}`,
  ];
}

function buildPrefillUrl(data: BotData): string {
  const params = new URLSearchParams();
  if (data.pickupAddress) params.set("from", data.pickupAddress);
  if (data.deliveryAddress) params.set("to", data.deliveryAddress);
  if (data.size) params.set("size", data.size);
  if (data.urgency) params.set("urgency", data.urgency);
  if (data.bookerName) params.set("name", data.bookerName);
  if (data.pickupPhone) params.set("pickupPhone", data.pickupPhone);
  if (data.deliveryPhone) params.set("deliveryPhone", data.deliveryPhone);
  return `${siteBase()}/booking?${params.toString()}`;
}

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `/connect <phone>` self-service binding for drivers/admins.
 *
 * Why phone and not a one-time token? For a 5-15-driver fleet, asking the
 * driver to send "/connect 0501234567" matches the phone we already have on
 * their profile. Spoofing risk is real (any chat can claim any phone), so
 * we cap the surface:
 *   - Only roles 'driver' and 'admin' are bindable. Customers don't go
 *     through this path; their phone-to-WhatsApp mapping is implicit.
 *   - We refuse if the phone matches an already-bound profile and the
 *     existing chat_id is different — operator must clear it manually.
 *
 * In production we'll harden this with a one-time token printed in the admin
 * UI (separate PR), but this gets the bot working today.
 */

interface ConnectResult {
  reply: string;
}

const CONNECT_RE = /^\/connect\s+(\S+)/i;
const WHOAMI_RE = /^\/whoami\b/i;
const DISCONNECT_RE = /^\/disconnect\b/i;

export function isConnectCommand(text: string): boolean {
  return CONNECT_RE.test(text) || WHOAMI_RE.test(text) || DISCONNECT_RE.test(text);
}

/** Israeli phone -> "972..." digits-only. Matches whatsapp.ts normalizePhone. */
export function normalizeIsraeliPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("972") && digits.length >= 11) return digits;
  if (digits.startsWith("0") && /^0\d{8,9}$/.test(digits)) return "972" + digits.slice(1);
  return null;
}

/** Variants that profiles.phone might have been stored as. */
function phoneVariants(normalized: string): string[] {
  // "972501234567" -> ["972501234567", "0501234567", "+972501234567", "972-50-1234567"]
  // We don't try to be exhaustive — match the common storage forms.
  const local = normalized.startsWith("972") ? "0" + normalized.slice(3) : null;
  const variants = [normalized, `+${normalized}`];
  if (local) variants.push(local);
  return variants;
}

export async function handleBotCommand(
  text: string,
  chatId: string,
  supabase: SupabaseClient,
): Promise<ConnectResult | null> {
  if (WHOAMI_RE.test(text)) {
    return await handleWhoami(chatId, supabase);
  }
  if (DISCONNECT_RE.test(text)) {
    return await handleDisconnect(chatId, supabase);
  }
  const m = text.match(CONNECT_RE);
  if (!m) return null;
  return await handleConnect(m[1], chatId, supabase);
}

async function handleConnect(
  phoneInput: string,
  chatId: string,
  supabase: SupabaseClient,
): Promise<ConnectResult> {
  const normalized = normalizeIsraeliPhone(phoneInput);
  if (!normalized) {
    return { reply: "מספר טלפון לא תקין. דוגמה: /connect 0501234567" };
  }

  const variants = phoneVariants(normalized);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, telegram_chat_id, phone")
    .in("phone", variants)
    .maybeSingle();

  if (!profile) {
    return {
      reply:
        "המספר לא רשום במערכת.\nאם אתה נהג חדש, פנה למנהל לפתיחת חשבון.",
    };
  }

  const p = profile as {
    id: string;
    full_name: string;
    role: string;
    telegram_chat_id: string | null;
    phone: string;
  };

  if (p.role !== "driver" && p.role !== "admin") {
    return { reply: "החיבור זמין כרגע רק לנהגים ולמנהלים." };
  }

  if (p.telegram_chat_id && p.telegram_chat_id !== chatId) {
    return {
      reply:
        "המספר כבר מחובר לחשבון טלגרם אחר. פנה למנהל לאיפוס.",
    };
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId })
    .eq("id", p.id);

  if (profileErr) {
    return { reply: "שגיאה בעת חיבור החשבון. נסה שוב מאוחר יותר." };
  }

  // For drivers, also stamp drivers.telegram_chat_id so the assignment-time
  // lookup (drivers.telegram_chat_id, before the profiles fallback) works
  // without extra joins.
  if (p.role === "driver") {
    await supabase
      .from("drivers")
      .update({ telegram_chat_id: chatId })
      .eq("user_id", p.id);
  }

  const roleLabel = p.role === "admin" ? "מנהל" : "נהג";
  return {
    reply: `✅ חובר בהצלחה!\nמחובר כ${roleLabel}: ${p.full_name}\nתקבל מעתה התראות והזמנות בטלגרם.`,
  };
}

async function handleWhoami(
  chatId: string,
  supabase: SupabaseClient,
): Promise<ConnectResult> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!data) {
    return {
      reply:
        "לא מחובר.\nכדי להתחבר: /connect <מספר טלפון>\nדוגמה: /connect 0501234567",
    };
  }
  const p = data as { full_name: string; role: string };
  const roleLabel = p.role === "admin" ? "מנהל" : p.role === "driver" ? "נהג" : p.role;
  return { reply: `מחובר כ${roleLabel}: ${p.full_name}` };
}

async function handleDisconnect(
  chatId: string,
  supabase: SupabaseClient,
): Promise<ConnectResult> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();

  if (!data) {
    return { reply: "לא היית מחובר." };
  }
  const p = data as { id: string; role: string };

  await supabase
    .from("profiles")
    .update({ telegram_chat_id: null })
    .eq("id", p.id);

  if (p.role === "driver") {
    await supabase
      .from("drivers")
      .update({ telegram_chat_id: null })
      .eq("user_id", p.id);
  }

  return { reply: "החשבון נותק. /connect כדי להתחבר שוב." };
}

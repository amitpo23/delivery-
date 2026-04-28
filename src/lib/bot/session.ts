import { createAdminClient } from "@/lib/supabase/admin";
import type { BotData, BotState } from "./conversation";

export interface BotSession {
  state: BotState;
  data: BotData;
  /** Last incoming update id we already processed (Telegram update_id /
   * Green API idMessage). Used to short-circuit retries that arrive after
   * a crash + retry cycle, so the user doesn't see double replies. */
  lastUpdateId?: string;
}

const FRESH: BotSession = { state: "idle", data: {} };

/**
 * Load the conversation session for (channel, external_id). Expired sessions
 * (>30min idle) are returned as fresh, so a returning user always gets a
 * clean welcome rather than landing mid-flow on stale state.
 */
export async function loadSession(
  channel: "telegram" | "whatsapp",
  externalId: string,
): Promise<BotSession> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bot_sessions")
    .select("state, data, expires_at")
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle();

  if (!data) return FRESH;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return FRESH;
  }
  const inner = (data.data as BotData & { __lastUpdateId?: string }) ?? {};
  const lastUpdateId = inner.__lastUpdateId;
  // Strip the bookkeeping field before returning the BotData the engine sees.
  const cleanData: BotData = { ...inner };
  delete (cleanData as { __lastUpdateId?: string }).__lastUpdateId;
  return {
    state: (data.state as BotState) ?? "idle",
    data: cleanData,
    lastUpdateId,
  };
}

export async function saveSession(
  channel: "telegram" | "whatsapp",
  externalId: string,
  session: BotSession,
): Promise<void> {
  const admin = createAdminClient();
  const expires = new Date(Date.now() + 30 * 60_000).toISOString();
  // We piggyback the lastUpdateId inside `data` JSONB rather than adding a
  // schema column — keeps migrations small and the field is per-session.
  const persisted = session.lastUpdateId
    ? { ...session.data, __lastUpdateId: session.lastUpdateId }
    : session.data;
  await admin
    .from("bot_sessions")
    .upsert(
      {
        channel,
        external_id: externalId,
        state: session.state,
        data: persisted,
        last_message_at: new Date().toISOString(),
        expires_at: expires,
      },
      { onConflict: "channel,external_id" },
    );
}

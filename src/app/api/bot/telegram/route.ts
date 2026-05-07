import { NextResponse } from "next/server";
import { handle } from "@/lib/bot/conversation";
import { loadSession, saveSession } from "@/lib/bot/session";
import { answerCallbackQuery, sendTelegramMessage } from "@/lib/bot/telegram-send";
import { handleDriverCallback } from "@/lib/bot/handle-callback";
import { handleBotCommand, isConnectCommand } from "@/lib/bot/connect";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Telegram Bot webhook.
 *
 * Setup once per environment:
 *   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
 *     -d url=https://<host>/api/bot/telegram \
 *     -d secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Always returns 200 to Telegram so a transient failure doesn't trigger a
 * retry storm — by the time Telegram retries, our session may already be
 * partially advanced and the user gets a confusing duplicate flow. We log
 * errors server-side for diagnosis instead.
 */
export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (expected && got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ ok: true, ignored: "invalid-json" });
    }

    const update = payload as {
      update_id?: number;
      message?: {
        chat?: { id?: number };
        text?: string;
      };
      callback_query?: {
        id?: string;
        from?: { id?: number };
        data?: string;
      };
    };

    // Driver-bot button taps arrive as callback_query (separate from
    // conversational messages). Route them to the dedicated handler;
    // the conversation state machine doesn't apply.
    if (update.callback_query) {
      const cbId = update.callback_query.id;
      const fromId = update.callback_query.from?.id;
      const data = update.callback_query.data;
      if (typeof cbId !== "string" || typeof fromId !== "number" || typeof data !== "string") {
        return NextResponse.json({ ok: true, ignored: "malformed-callback" });
      }
      try {
        const supabase = createAdminClient();
        const outcome = await handleDriverCallback(
          { callbackId: cbId, chatId: String(fromId), data, raw: update.callback_query },
          supabase,
        );
        try {
          await answerCallbackQuery(cbId, outcome.ack, outcome.status === "rejected");
        } catch (err) {
          console.error("[telegram] answerCallbackQuery failed", err);
        }
      } catch (err) {
        console.error("[telegram] callback handler crashed", err);
        try {
          await answerCallbackQuery(cbId, "שגיאת מערכת. נסו שוב.", true);
        } catch {
          /* ignore */
        }
      }
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message?.chat?.id;
    const text = update.message?.text;
    if (typeof chatId !== "number" || typeof text !== "string") {
      return NextResponse.json({ ok: true, ignored: "non-text-update" });
    }

    const externalId = String(chatId);
    const session = await loadSession("telegram", externalId);

    // Idempotency — Telegram retries the same update_id on transient
    // network blips. Skip if we've already processed it.
    const updateIdStr = update.update_id != null ? String(update.update_id) : undefined;
    if (updateIdStr && session.lastUpdateId === updateIdStr) {
      return NextResponse.json({ ok: true, ignored: "duplicate-update" });
    }

    // /connect, /whoami, /disconnect are admin/driver self-service binding
    // commands — they bypass the booking-conversation state machine entirely
    // because they need DB access (looking up profile by phone) and don't fit
    // the pure-function shape of `handle`.
    if (isConnectCommand(text.trim())) {
      try {
        const supabase = createAdminClient();
        const result = await handleBotCommand(text.trim(), externalId, supabase);
        if (result) {
          // Persist update_id so a retry of the same /connect doesn't try again.
          await saveSession("telegram", externalId, {
            state: session.state,
            data: session.data,
            lastUpdateId: updateIdStr,
          });
          await sendTelegramMessage(chatId, result.reply);
          return NextResponse.json({ ok: true });
        }
      } catch (err) {
        console.error("[telegram] /connect handler crashed", err);
        try {
          await sendTelegramMessage(chatId, "שגיאת מערכת. נסו שוב.");
        } catch {
          /* ignore */
        }
        return NextResponse.json({ ok: true });
      }
    }

    const result = handle({ state: session.state, data: session.data, message: text });

    await saveSession("telegram", externalId, {
      state: result.newState,
      data: result.newData,
      lastUpdateId: updateIdStr,
    });

    for (const reply of result.replies) {
      if (!reply.trim()) continue;
      try {
        await sendTelegramMessage(chatId, reply);
      } catch (err) {
        console.error("[telegram] send failed", err);
        break;
      }
    }
  } catch (err) {
    // Catch-all so the route never returns non-200 to Telegram. The
    // session state may be partially saved or not — that's acceptable
    // because the user's next message will pick up wherever we are.
    console.error("[telegram] webhook crashed", err);
  }

  return NextResponse.json({ ok: true });
}

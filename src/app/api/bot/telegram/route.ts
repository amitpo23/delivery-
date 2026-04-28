import { NextResponse } from "next/server";
import { handle } from "@/lib/bot/conversation";
import { loadSession, saveSession } from "@/lib/bot/session";
import { sendTelegramMessage } from "@/lib/bot/telegram-send";

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
    };

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

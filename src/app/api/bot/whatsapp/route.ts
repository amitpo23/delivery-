import { NextResponse } from "next/server";
import { handle } from "@/lib/bot/conversation";
import { loadSession, saveSession } from "@/lib/bot/session";
import { sendWhatsAppMessage } from "@/lib/bot/whatsapp-send";

/**
 * Green API webhook for incoming WhatsApp messages.
 *
 * Setup (once per environment):
 *   PATCH https://api.green-api.com/waInstance<ID>/SetSettings/<TOKEN>
 *   {
 *     "webhookUrl": "https://<host>/api/bot/whatsapp",
 *     "webhookUrlToken": "<GREEN_API_WEBHOOK_SECRET>",
 *     "incomingWebhook": "yes"
 *   }
 *
 * Always returns 200 so Green API doesn't replay messages — the same
 * retry-storm rationale as the Telegram webhook.
 */
export async function POST(req: Request) {
  const expected = process.env.GREEN_API_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("authorization");
    if (!got || (got !== expected && got !== `Bearer ${expected}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ ok: true, ignored: "invalid-json" });
    }

    const event = payload as {
      typeWebhook?: string;
      idMessage?: string;
      senderData?: { chatId?: string; sender?: string };
      messageData?: {
        typeMessage?: string;
        textMessageData?: { textMessage?: string };
        extendedTextMessageData?: { text?: string };
      };
    };

    if (event.typeWebhook !== "incomingMessageReceived") {
      return NextResponse.json({ ok: true, ignored: event.typeWebhook ?? "unknown" });
    }

    const chatId = event.senderData?.chatId ?? event.senderData?.sender;
    const text =
      event.messageData?.textMessageData?.textMessage ??
      event.messageData?.extendedTextMessageData?.text;

    if (!chatId || !text) {
      return NextResponse.json({ ok: true, ignored: "missing-chat-or-text" });
    }
    if (chatId.endsWith("@g.us")) {
      return NextResponse.json({ ok: true, ignored: "group" });
    }

    const externalId = chatId;
    const session = await loadSession("whatsapp", externalId);

    // Idempotency: Green API retries on 5xx using the same idMessage.
    if (event.idMessage && session.lastUpdateId === event.idMessage) {
      return NextResponse.json({ ok: true, ignored: "duplicate-message" });
    }

    const result = handle({ state: session.state, data: session.data, message: text });

    await saveSession("whatsapp", externalId, {
      state: result.newState,
      data: result.newData,
      lastUpdateId: event.idMessage,
    });

    for (const reply of result.replies) {
      if (!reply.trim()) continue;
      try {
        await sendWhatsAppMessage(externalId, reply);
      } catch (err) {
        console.error("[whatsapp] send failed", err);
        break;
      }
    }
  } catch (err) {
    console.error("[whatsapp] webhook crashed", err);
  }

  return NextResponse.json({ ok: true });
}

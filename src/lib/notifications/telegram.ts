import type { NotificationRequest, NotificationResult, NotificationSender } from "./types";
import { NotificationError } from "./types";
import { renderMessage } from "./templates";

/**
 * Telegram sender via Bot API (https://api.telegram.org).
 *
 * Stub mode kicks in when TELEGRAM_BOT_TOKEN is missing — useful for dev/CI.
 * Live mode sends a real `sendMessage` call. We intentionally avoid pulling in
 * grammY here: a single REST call to `sendMessage` is enough for outbound
 * notifications. grammY can be introduced later when we add a bidirectional
 * bot (PR will be separate).
 */
export class TelegramSender implements NotificationSender {
  readonly channel = "telegram" as const;

  constructor(private readonly token: string | undefined = process.env.TELEGRAM_BOT_TOKEN) {}

  private get isStub(): boolean {
    return !this.token;
  }

  async send(req: NotificationRequest): Promise<NotificationResult> {
    const { title, body } = renderMessage(req.template, req.payload);
    // Plain text — no parse_mode. Markdown/HTML escaping for arbitrary user
    // input (Hebrew addresses, customer-supplied notes) is footgun-prone and
    // a single unbalanced "_" or "*" makes Telegram return HTTP 400 and the
    // notification silently fails.
    const text = title === body ? body : `${title}\n\n${body}`;

    if (this.isStub) {
      return {
        ok: true,
        externalId: `tg_stub_${Date.now()}`,
        raw: { stub: true, recipient: req.recipient, text },
      };
    }

    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: req.recipient,
          text,
          disable_web_page_preview: true,
        }),
      });
    } catch (err) {
      throw new NotificationError("Telegram network error", this.channel, err);
    }

    const data = (await res.json().catch(() => null)) as
      | { ok: boolean; result?: { message_id: number }; description?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        failureReason: data?.description ?? `HTTP ${res.status}`,
        raw: data,
      };
    }
    return {
      ok: true,
      externalId: data.result?.message_id ? String(data.result.message_id) : undefined,
      raw: data,
    };
  }
}

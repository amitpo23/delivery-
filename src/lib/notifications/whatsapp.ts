import type { NotificationRequest, NotificationResult, NotificationSender } from "./types";
import { NotificationError } from "./types";
import { renderMessage } from "./templates";

/**
 * WhatsApp sender via Green API (https://green-api.com).
 *
 * Green API exposes a simple REST endpoint per "instance". To go live you
 * provision an instance on green-api.com (or self-host their gate) and set:
 *   - GREEN_API_INSTANCE_ID
 *   - GREEN_API_TOKEN
 *
 * Note on the official path: Green API is an unofficial WhatsApp gateway
 * (Web protocol), good for fast launch but Meta can suspend the linked phone.
 * For long-term we plan to migrate to the WhatsApp Business API via Twilio
 * — same NotificationSender interface, swap the env to flip providers.
 */
export class WhatsAppSender implements NotificationSender {
  readonly channel = "whatsapp" as const;

  constructor(
    private readonly instanceId: string | undefined = process.env.GREEN_API_INSTANCE_ID,
    private readonly token: string | undefined = process.env.GREEN_API_TOKEN
  ) {}

  private get isStub(): boolean {
    return !this.instanceId || !this.token;
  }

  async send(req: NotificationRequest): Promise<NotificationResult> {
    const { title, body } = renderMessage(req.template, req.payload);
    const message = title === body ? body : `*${title}*\n\n${body}`;
    const phone = normalizePhone(req.recipient);
    if (!phone) {
      return { ok: false, failureReason: "Invalid phone number" };
    }

    if (this.isStub) {
      return {
        ok: true,
        externalId: `wa_stub_${Date.now()}`,
        raw: { stub: true, recipient: phone, message },
      };
    }

    const url = `https://api.green-api.com/waInstance${this.instanceId}/sendMessage/${this.token}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
      });
    } catch (err) {
      throw new NotificationError("WhatsApp network error", this.channel, err);
    }

    const data = (await res.json().catch(() => null)) as
      | { idMessage?: string; error?: string }
      | null;
    if (!res.ok || !data?.idMessage) {
      return {
        ok: false,
        failureReason: data?.error ?? `HTTP ${res.status}`,
        raw: data,
      };
    }
    return { ok: true, externalId: data.idMessage, raw: data };
  }
}

/**
 * Israeli mobile -> E.164 digits-only without leading "+".
 * "050-1234567" -> "972501234567"
 * "+972501234567" -> "972501234567"
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

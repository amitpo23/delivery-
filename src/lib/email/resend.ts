import type { EmailMessage, EmailSender } from "./types";

/**
 * Resend transactional email wrapper. Falls back to a console log when
 * RESEND_API_KEY isn't set, so dev/preview deploys don't try to send
 * real mail. Same pattern as the WA/Telegram senders.
 *
 * From: configurable via EMAIL_FROM, defaults to a noreply on the
 * default Vercel domain — replace with the verified domain once
 * elihav.co.il is wired in Resend.
 */
export class ResendSender implements EmailSender {
  constructor(
    private readonly apiKey: string | undefined = process.env.RESEND_API_KEY,
    private readonly from: string = process.env.EMAIL_FROM ??
      "אליהב משלוחים <noreply@delivery-rosy-gamma.vercel.app>",
  ) {}

  async send(msg: EmailMessage): Promise<{ id: string }> {
    if (!this.apiKey) {
      console.log("[email stub]", msg.to, msg.subject, msg.text.slice(0, 80));
      return { id: `email_stub_${Date.now()}` };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend send failed: ${res.status} ${body}`);
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { id: json.id ?? `email_${Date.now()}` };
  }
}

export function getEmailSender(): EmailSender {
  return new ResendSender();
}

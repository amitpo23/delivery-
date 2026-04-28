/**
 * Outgoing WhatsApp messages via Green API. Same separation rationale as
 * telegram-send: bot replies are not notifications, so they don't flow
 * through notification_log.
 *
 * Falls back to console-log when GREEN_API_INSTANCE_ID/TOKEN are missing
 * so a deploy without credentials still works in stub mode.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;

  if (!instanceId || !token) {
    console.log("[whatsapp stub]", phone, message.slice(0, 80));
    return;
  }

  // Green API expects the phone in chatId form: digits + "@c.us". The phone
  // we get from incoming webhooks is already in that form, but if a caller
  // passes a raw number we normalize to digits-only and append the suffix.
  const chatId = phone.includes("@") ? phone : `${phone.replace(/\D/g, "")}@c.us`;

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Green API sendMessage failed: ${res.status} ${body}`);
  }
}

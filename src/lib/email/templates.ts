import type { EmailMessage } from "./types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://delivery-rosy-gamma.vercel.app";
const COMPANY = "אליהב כהן פודגרופ ומשלוחים";

/**
 * Order-creation receipt: confirms payment and gives the customer a
 * tracking link. Sent right after a successful /api/orders insert.
 *
 * Using inline styles in the HTML because Resend / Gmail renderers
 * don't apply external stylesheets and we want consistent look.
 */
export function orderConfirmationEmail(args: {
  to: string;
  orderNumber: string;
  total: number;
  pickupAddress: string;
  deliveryAddress: string;
  bookerName: string;
}): EmailMessage {
  const trackUrl = `${SITE}/track/${args.orderNumber}`;
  const subject = `אישור הזמנה ${args.orderNumber} — ${COMPANY}`;

  const text = [
    `היי ${args.bookerName},`,
    "",
    `קיבלנו את ההזמנה שלך!`,
    "",
    `מספר הזמנה: ${args.orderNumber}`,
    `סכום: ${args.total}₪`,
    `איסוף: ${args.pickupAddress}`,
    `מסירה: ${args.deliveryAddress}`,
    "",
    `מעקב בזמן אמת: ${trackUrl}`,
    "",
    `תודה,`,
    `${COMPANY}`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F8FAFC;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
    <h1 style="color:#1E3A5F;font-size:20px;margin:0 0 16px">היי ${escape(args.bookerName)},</h1>
    <p style="font-size:16px;color:#334155;margin:0 0 24px">קיבלנו את ההזמנה שלך 🎉</p>

    <div style="background:#F1F5F9;border-radius:12px;padding:16px;margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#64748B;font-size:14px">מספר הזמנה</span>
        <span style="font-family:monospace;font-weight:bold;color:#1E3A5F" dir="ltr">${escape(args.orderNumber)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#64748B;font-size:14px">סכום</span>
        <span style="font-weight:bold;color:#1E3A5F">${args.total}₪</span>
      </div>
      <div style="font-size:13px;color:#475569;border-top:1px solid #CBD5E1;padding-top:8px;margin-top:8px">
        <div>איסוף: ${escape(args.pickupAddress)}</div>
        <div>מסירה: ${escape(args.deliveryAddress)}</div>
      </div>
    </div>

    <a href="${trackUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600">מעקב בזמן אמת</a>

    <p style="color:#94A3B8;font-size:12px;margin-top:32px">${escape(COMPANY)}</p>
  </div>
</body>
</html>`;

  return { to: args.to, subject, text, html };
}

/**
 * Lightweight HTML escape — covers the cases that show up in our data
 * (names, addresses). Don't use this for arbitrary user-supplied HTML.
 */
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

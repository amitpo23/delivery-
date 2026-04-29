import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:noreply@elihav.co.il";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to every subscription matching the audience.
 * Stale subscriptions (404/410 from the push gateway) are pruned so the
 * next sweep doesn't keep retrying dead browsers.
 */
export async function sendPush(args: {
  audience: { userId?: string; phone?: string };
  payload: PushPayload;
}): Promise<{ sent: number; pruned: number }> {
  if (!configure()) {
    console.log("[push stub]", args.audience, args.payload.title);
    return { sent: 0, pruned: 0 };
  }

  const admin = createAdminClient();
  let q = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (args.audience.userId) q = q.eq("user_id", args.audience.userId);
  else if (args.audience.phone) q = q.eq("phone", args.audience.phone);
  else return { sent: 0, pruned: 0 };

  const { data: subs } = await q;
  if (!subs || subs.length === 0) return { sent: 0, pruned: 0 };

  let sent = 0;
  const pruneIds: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(args.payload),
        );
        sent += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          pruneIds.push(s.id);
        } else {
          console.error("[push] send failed", err);
        }
      }
    }),
  );

  if (pruneIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", pruneIds);
  }

  return { sent, pruned: pruneIds.length };
}

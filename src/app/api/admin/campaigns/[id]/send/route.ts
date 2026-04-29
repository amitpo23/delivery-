import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAudience } from "@/lib/campaigns/audience";
import { getEmailSender } from "@/lib/email/resend";

interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  audience_filter: { tags?: string[]; minOrders?: number; maxDaysSinceLast?: number };
  status: "draft" | "sending" | "sent" | "failed";
}

/**
 * Sends the campaign to its resolved audience. Idempotent against a
 * partial earlier send via the UNIQUE(campaign_id, recipient_email) on
 * email_campaign_sends — re-running skips already-sent recipients.
 *
 * Long campaigns can outlive a single Vercel invocation. For now we cap
 * at 200 sends per call; the admin can re-invoke to drain the rest.
 * Once the volume justifies it this should move to a queue.
 */

const BATCH_LIMIT = 200;

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("email_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle<CampaignRow>();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "sent") {
    return NextResponse.json({ error: "Already sent" }, { status: 409 });
  }

  await admin.from("email_campaigns").update({ status: "sending" }).eq("id", id);

  const audience = await resolveAudience(campaign.audience_filter);
  const { data: alreadySent } = await admin
    .from("email_campaign_sends")
    .select("recipient_email")
    .eq("campaign_id", id);
  const sentEmails = new Set((alreadySent ?? []).map((r) => r.recipient_email));

  const remaining = audience.filter((a) => !sentEmails.has(a.email)).slice(0, BATCH_LIMIT);

  const sender = getEmailSender();
  let delivered = 0;
  let failed = 0;

  for (const recipient of remaining) {
    let status: "sent" | "failed" = "sent";
    let error: string | null = null;
    let externalId: string | null = null;
    try {
      const result = await sender.send({
        to: recipient.email,
        subject: campaign.subject,
        text: campaign.body_text,
        html: campaign.body_html ?? undefined,
      });
      externalId = result.id;
      delivered += 1;
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
      failed += 1;
    }
    await admin.from("email_campaign_sends").insert({
      campaign_id: id,
      recipient_email: recipient.email,
      customer_id: recipient.customer_id,
      status,
      error_reason: error,
      external_id: externalId,
    });
  }

  // If the audience had > BATCH_LIMIT untouched recipients, keep the
  // campaign in `sending` so the admin can press Send again to drain.
  const drained = remaining.length < BATCH_LIMIT;
  const newStatus = drained ? "sent" : "sending";
  const newSentAt = drained ? new Date().toISOString() : null;

  // Re-tally totals from the audit table so partial runs add up correctly.
  const { count: totalDelivered } = await admin
    .from("email_campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id)
    .eq("status", "sent");
  const { count: totalFailed } = await admin
    .from("email_campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id)
    .eq("status", "failed");

  await admin
    .from("email_campaigns")
    .update({
      status: newStatus,
      sent_at: newSentAt,
      delivered_count: totalDelivered ?? 0,
      failed_count: totalFailed ?? 0,
      recipients_count: audience.length,
    })
    .eq("id", id);

  return NextResponse.json({
    delivered,
    failed,
    drained,
    audience: audience.length,
    remaining: audience.length - (totalDelivered ?? 0) - (totalFailed ?? 0),
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const Body = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().max(500).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; docId: string }> },
) {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const { id: driverId, docId } = await context.params;

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const v = Body.safeParse(parsed);
  if (!v.success) {
    return NextResponse.json({ error: "Validation failed", issues: v.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("driver_documents")
    .update({
      status: v.data.status,
      rejection_reason: v.data.status === "rejected" ? v.data.rejectionReason ?? null : null,
      reviewed_by: guard.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("driver_id", driverId)
    .select("id, doc_type, status")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // If every required doc type is now approved, flip drivers.is_verified.
  const REQUIRED = ["license", "vehicle_registration", "insurance", "id_card"];
  const { data: docs } = await admin
    .from("driver_documents")
    .select("doc_type, status")
    .eq("driver_id", driverId)
    .eq("status", "approved");
  const approvedTypes = new Set((docs ?? []).map((d) => d.doc_type));
  const allApproved = REQUIRED.every((t) => approvedTypes.has(t));
  if (allApproved) {
    await admin.from("drivers").update({ is_verified: true }).eq("id", driverId);
  }

  await logAudit({
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    actorRole: guard.role,
    action: `document.${v.data.status}`,
    targetType: "driver_document",
    targetId: docId,
    after: { status: v.data.status, doc_type: data.doc_type },
  });

  return NextResponse.json({ document: data, driverVerified: allApproved });
}

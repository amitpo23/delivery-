import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const DOCS_BUCKET = "driver-docs";
const ALLOWED_TYPES = ["license", "vehicle_registration", "insurance", "id_card"] as const;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

export async function GET() {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  let driverId: string | null = null;
  if (guard.role === "driver") {
    const { data: d } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    driverId = d?.id ?? null;
  }

  let q = admin
    .from("driver_documents")
    .select("id, driver_id, doc_type, status, rejection_reason, file_path, uploaded_at, reviewed_at")
    .order("uploaded_at", { ascending: false });
  if (driverId) q = q.eq("driver_id", driverId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const docType = String(form.get("doc_type") ?? "");
  const file = form.get("file");

  if (!ALLOWED_TYPES.includes(docType as typeof ALLOWED_TYPES[number])) {
    return NextResponse.json({ error: "Invalid doc_type" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG / PNG / WebP / PDF" }, { status: 415 });
  }

  const admin = createAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("id")
    .eq("user_id", guard.user.id)
    .maybeSingle();
  if (!driver) {
    return NextResponse.json({ error: "No driver row for this user" }, { status: 404 });
  }

  // Path layout: <driver_id>/<doc_type>-<timestamp>.<ext>
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "application/pdf"
          ? "pdf"
          : "jpg";
  const path = `${driver.id}/${docType}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadErr) {
    return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // Soft-supersede any existing pending/approved doc of the same type by
  // marking it rejected — the unique partial index is DEFERRABLE so this
  // could also live in a transaction, but a simple two-step works since
  // re-upload is rare and admin-supervised.
  await admin
    .from("driver_documents")
    .update({
      status: "rejected",
      rejection_reason: "Replaced by newer upload",
    })
    .eq("driver_id", driver.id)
    .eq("doc_type", docType)
    .in("status", ["pending", "approved"]);

  const { data, error: insertErr } = await admin
    .from("driver_documents")
    .insert({
      driver_id: driver.id,
      doc_type: docType,
      file_path: path,
      status: "pending",
    })
    .select("id, doc_type, status, file_path, uploaded_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ document: data });
}

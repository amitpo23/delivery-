import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDriverTransitionAllowed } from "@/lib/orders/transitions";
import type { OrderStatus } from "@/types";

const POD_BUCKET = "pod-images";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_SIGNATURE_BYTES = 1 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole(["driver", "admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const photo = form.get("photo");
  const signatureRaw = form.get("signature"); // PNG dataURL string from <canvas>
  const notes = (form.get("notes") as string | null) ?? null;

  if (!(photo instanceof Blob) && typeof signatureRaw !== "string") {
    return NextResponse.json(
      { error: "At least one of photo / signature is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, driver_id")
    .eq("id", id)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (guard.role === "driver") {
    const { data: driver } = await admin
      .from("drivers")
      .select("id")
      .eq("user_id", guard.user.id)
      .maybeSingle();
    if (!driver || driver.id !== order.driver_id) {
      return NextResponse.json({ error: "Not your order" }, { status: 403 });
    }
  }

  if (!isDriverTransitionAllowed(order.status as OrderStatus, "delivered")) {
    return NextResponse.json(
      { error: `Cannot deliver from status ${order.status}` },
      { status: 409 },
    );
  }

  // Storage path layout `<order_id>/<filename>` is required so customers and
  // admins can read the POD via the bucket SELECT policies in migration 003,
  // which match on (storage.foldername(name))[1] = order_id::text. The upload
  // here uses the service-role admin client and isn't blocked by RLS, but
  // anything stored outside that prefix would be invisible to readers.
  const storagePaths: { photo?: string; signature?: string } = {};

  if (photo instanceof Blob) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo too large (max 8MB)" }, { status: 413 });
    }
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: "Photo must be JPEG/PNG/WebP" }, { status: 415 });
    }
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/photo-${Date.now()}.${ext}`;
    const { error: uploadErr } = await admin.storage.from(POD_BUCKET).upload(path, photo, {
      contentType: photo.type || "image/jpeg",
      upsert: false,
    });
    if (uploadErr) {
      return NextResponse.json({ error: `Photo upload failed: ${uploadErr.message}` }, { status: 500 });
    }
    storagePaths.photo = path;
  }

  if (typeof signatureRaw === "string" && signatureRaw.startsWith("data:image/")) {
    // dataURL → bytes. Cap to MAX_SIGNATURE_BYTES *after* decoding so a 4×
    // base64 padding doesn't get past the gate.
    const commaIdx = signatureRaw.indexOf(",");
    const base64 = commaIdx >= 0 ? signatureRaw.slice(commaIdx + 1) : "";
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0) {
      return NextResponse.json({ error: "Invalid signature payload" }, { status: 400 });
    }
    if (bytes.length > MAX_SIGNATURE_BYTES) {
      return NextResponse.json({ error: "Signature too large" }, { status: 413 });
    }
    const path = `${id}/signature-${Date.now()}.png`;
    const { error: uploadErr } = await admin.storage.from(POD_BUCKET).upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (uploadErr) {
      return NextResponse.json(
        { error: `Signature upload failed: ${uploadErr.message}` },
        { status: 500 },
      );
    }
    storagePaths.signature = path;
  }

  // Optimistic update guards against a parallel transition (e.g. admin
  // marked it cancelled while driver was uploading).
  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", order.status)
    .select("id, status, delivered_at")
    .maybeSingle();

  if (updateErr || !updated) {
    return NextResponse.json(
      {
        error: "Order changed concurrently — refresh and retry",
        uploaded: storagePaths,
      },
      { status: 409 },
    );
  }

  await admin.from("order_status_history").insert({
    order_id: id,
    status: "delivered",
    notes: notes
      ? `Delivered by ${guard.role}. ${notes}`
      : `Delivered by ${guard.role}`,
  });

  return NextResponse.json({ order: updated, paths: storagePaths });
}

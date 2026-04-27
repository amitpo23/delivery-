import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_FIELDS =
  "id, order_number, status, service_type, pickup_address, delivery_address, time_window, distance_km, estimated_price, created_at, delivered_at, pickup_lat, pickup_lng, delivery_lat, delivery_lng";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  if (!orderNumber || !/^DEL-[A-Z0-9-]+$/i.test(orderNumber)) {
    return NextResponse.json({ error: "Invalid tracking number" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: "Tracking is not available yet — server not connected to Supabase", details: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }

  const { data: order, error } = await admin
    .from("orders")
    .select(PUBLIC_FIELDS)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Lookup failed", details: error.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: history } = await admin
    .from("order_status_history")
    .select("status, notes, created_at, lat, lng")
    .eq("order_id", (order as { id: string }).id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    order,
    history: history ?? [],
  });
}

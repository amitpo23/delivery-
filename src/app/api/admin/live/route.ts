import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const guard = await requireRole(["admin", "dispatcher"]);
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  const [driversRes, ordersRes] = await Promise.all([
    admin
      .from("drivers")
      .select(
        `id, status, current_lat, current_lng, last_location_update,
         vehicle_type,
         profile:profiles!drivers_user_id_fkey(full_name, phone)`,
      )
      .neq("status", "offline")
      .not("current_lat", "is", null)
      .not("current_lng", "is", null),
    admin
      .from("orders")
      .select(
        `id, order_number, status, driver_id,
         pickup_address, pickup_lat, pickup_lng,
         delivery_address, delivery_lat, delivery_lng`,
      )
      .in("status", ["pending", "confirmed", "assigned", "picked_up", "in_transit"]),
  ]);

  if (driversRes.error) {
    return NextResponse.json({ error: driversRes.error.message }, { status: 500 });
  }
  if (ordersRes.error) {
    return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
  }

  type ApiDriver = {
    id: string;
    status: string;
    current_lat: number | null;
    current_lng: number | null;
    last_location_update: string | null;
    vehicle_type: string | null;
    profile: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null;
  };

  const drivers = (driversRes.data as ApiDriver[]).map((d) => {
    const p = Array.isArray(d.profile) ? d.profile[0] : d.profile;
    return {
      id: d.id,
      name: p?.full_name ?? "—",
      phone: p?.phone ?? "",
      status: d.status,
      vehicleType: d.vehicle_type,
      lat: d.current_lat,
      lng: d.current_lng,
      lastUpdate: d.last_location_update,
    };
  });

  return NextResponse.json({
    drivers,
    orders: ordersRes.data ?? [],
    fetchedAt: new Date().toISOString(),
  });
}

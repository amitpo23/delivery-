import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type GuardResult<TUser> =
  | { ok: true; user: TUser; role: UserRole }
  | { ok: false; response: NextResponse };

/**
 * Verify the request is authenticated and the caller has one of the allowed
 * roles. Returns either the resolved profile or a NextResponse to short-circuit
 * the route handler with.
 *
 * Allowed roles fan out: passing ["admin"] denies dispatcher/driver/customer
 * even though admins can do their work too. Pass the union explicitly when
 * you want to allow more than one (e.g. ["admin", "dispatcher"]).
 */
export async function requireRole(
  allowed: readonly UserRole[]
): Promise<GuardResult<{ id: string; email: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Profile not found" }, { status: 403 }),
    };
  }

  const role = profile.role as UserRole;
  if (!allowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user: { id: user.id, email: user.email ?? null }, role };
}

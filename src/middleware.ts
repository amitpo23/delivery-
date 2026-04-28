import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_PREFIX = "/admin";
const DRIVER_PREFIX = "/driver";
const PORTAL_PREFIXES = ["/dashboard", "/orders", "/profile"] as const;

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAdmin = pathname.startsWith(ADMIN_PREFIX);
  const needsDriver = pathname.startsWith(DRIVER_PREFIX);
  const needsPortal = PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!needsAdmin && !needsDriver && !needsPortal) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured yet, fail safe: deny access to gated areas
  // by redirecting to /login. Better than leaking the page or 500-ing.
  if (!isHttpUrl(url) || !key) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("reason", "auth_unconfigured");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next();

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const allowed =
    (needsAdmin && role === "admin") ||
    (needsDriver && (role === "driver" || role === "admin")) ||
    (needsPortal && role === "customer");

  // Send admins/drivers/dispatchers landing on /dashboard or /orders to
  // their own home rather than dumping them in a customer portal that
  // shows nothing useful for their role.
  if (needsPortal && role && role !== "customer") {
    const home = role === "admin" || role === "dispatcher" ? "/admin/orders" : "/driver/tasks";
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (!allowed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/driver/:path*",
    "/dashboard/:path*",
    "/dashboard",
    "/orders/:path*",
    "/orders",
    "/profile/:path*",
    "/profile",
  ],
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Named to match Supabase's own SSR auth guides ("middleware.ts" +
// updateSession()); the actual Next.js entry point that calls this is
// /proxy.ts (Next.js 16 renamed the `middleware.ts` file convention to
// `proxy.ts` — see node_modules/next/dist/docs/.../proxy.md).

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/today",
  "/goals",
  "/plan-90-days",
  "/projects",
  "/tasks",
  "/calendar",
  "/habits",
  "/focus",
  "/journal",
  "/ideas",
  "/reviews",
  "/analytics",
  "/ai-coach",
  "/settings",
];

// Logged-in users shouldn't land back on these; /forgot-password and
// /reset-password stay reachable regardless of session state (the latter
// is the destination of the password-recovery flow itself).
const LOGGED_OUT_ONLY_ROUTES = ["/login", "/signup"];

/**
 * Refreshes the Supabase session cookie on every request and enforces route
 * protection. Uses getUser() (revalidates the token against Supabase Auth),
 * never getSession() alone, per Supabase's server-side guidance — a cached
 * session cookie is not sufficient proof of a still-valid user.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isLoggedOutOnly = LOGGED_OUT_ONLY_ROUTES.includes(pathname);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoggedOutOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

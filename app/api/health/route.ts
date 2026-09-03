import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Trivial connectivity check for Phase 1 (Phase 0 blueprint §U) — verifies
 * env vars are present and Supabase responds. No schema/tables exist yet,
 * so this deliberately does not query any table.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        status: "not_configured",
        message: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      },
      { status: 200 },
    );
  }

  try {
    const supabase = await createClient();
    // getSession() only reads local cookies/env — safe with zero tables.
    const { error } = await supabase.auth.getSession();
    if (error) throw error;

    return NextResponse.json({ status: "connected" }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Unknown Supabase connection error.",
      },
      { status: 200 },
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles Google's redirect back after the user approves the OAuth consent
// screen (see loginWithGoogle in ../../login/actions.ts) — exchanges the
// authorization `code` for a real session. Different flow from
// auth/confirm/route.ts (email confirmation's token_hash + verifyOtp).
//
// The origin/forwarded-host branching below is the official Supabase
// pattern for this route: behind Vercel's proxy, `origin` parsed from the
// request URL can resolve to an internal address rather than the public
// domain, which is exactly the kind of mismatch that sent the email
// confirmation link to localhost before — x-forwarded-host is the real
// public host in production.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // If there's an error from OAuth provider, log it and redirect
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/me?error=auth_failed&reason=${error}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError);
      console.error("Code:", code);
      console.error("Origin:", origin);
      // Redirect to error page or back to me page
      return NextResponse.redirect(
        `${origin}/me?error=auth_failed&reason=${exchangeError.message}`
      );
    }

    // Successfully exchanged code for session
    if (data.session) {
      console.log("Successfully authenticated user:", data.session.user.id);
    }
  } else {
    // No code parameter, might be a direct visit to callback
    console.warn("No code parameter in callback URL");
    return NextResponse.redirect(
      `${origin}/me?error=auth_failed&reason=no_code`
    );
  }

  // If linking identity, redirect back to /me page
  // Otherwise redirect to the specified next URL or home
  const redirectUrl = next.startsWith("/") ? `${origin}${next}` : `${origin}/`;
  return NextResponse.redirect(redirectUrl);
}

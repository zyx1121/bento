import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export async function GET(request: NextRequest) {
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
      `${origin}/me?error=auth_failed&reason=${encodeURIComponent(error)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();

    // Create server client with proper cookie handling for PKCE
    // Important: Use the request cookies to ensure PKCE code_verifier is available
    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          // Get all cookies from the request
          const requestCookies = request.cookies.getAll();
          // Also get cookies from cookieStore (server-side cookies)
          const serverCookies = cookieStore.getAll();
          // Merge both, prioritizing request cookies for PKCE
          const cookieMap = new Map();
          serverCookies.forEach((c) => cookieMap.set(c.name, c));
          requestCookies.forEach((c) => cookieMap.set(c.name, c));
          return Array.from(cookieMap.values());
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions: any = { ...options };

              if (process.env.NODE_ENV === "production") {
                cookieOptions.domain = ".winlab.tw";
              }

              cookieOptions.sameSite = "lax";
              cookieOptions.secure = process.env.NODE_ENV === "production";

              cookieStore.set(name, value, cookieOptions);
            });
          } catch (error) {
            console.error("Error setting cookie:", error);
          }
        },
      },
    });

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError);
      console.error("Code:", code);
      console.error("Origin:", origin);
      // Log all cookies for debugging
      const allCookies = cookieStore.getAll();
      const requestCookies = request.cookies.getAll();
      console.error(
        "Server cookies:",
        allCookies.map((c) => c.name)
      );
      console.error(
        "Request cookies:",
        requestCookies.map((c) => c.name)
      );
      // Redirect to error page or back to me page
      return NextResponse.redirect(
        `${origin}/me?error=auth_failed&reason=${encodeURIComponent(
          exchangeError.message
        )}`
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

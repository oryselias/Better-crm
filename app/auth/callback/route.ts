import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSupabaseEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";

function getSafeRedirectPath(rawPath: string | null) {
  if (!rawPath || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return "/dashboard";
  }

  return rawPath;
}

export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (!hasSupabasePublicEnv()) {
    loginUrl.searchParams.set(
      "error",
      "Supabase is not configured for Google sign-in yet.",
    );
    return NextResponse.redirect(loginUrl);
  }

  const providerError =
    request.nextUrl.searchParams.get("error_description") ??
    request.nextUrl.searchParams.get("error");

  if (providerError) {
    loginUrl.searchParams.set("error", providerError);
    return NextResponse.redirect(loginUrl);
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    loginUrl.searchParams.set(
      "error",
      "Google sign-in did not return an authorization code.",
    );
    return NextResponse.redirect(loginUrl);
  }

  const redirectUrl = new URL(
    getSafeRedirectPath(request.nextUrl.searchParams.get("next")),
    request.url,
  );
  const response = NextResponse.redirect(redirectUrl);
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

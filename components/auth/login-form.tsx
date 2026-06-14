"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SUSPENDED_MESSAGE = "Your clinic account is suspended. Contact your administrator.";
const NO_CLINIC_MESSAGE = "No clinic assigned. Please contact your administrator.";

async function getPostLoginBlockReason(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NO_CLINIC_MESSAGE;

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.clinic_id) return NO_CLINIC_MESSAGE;

  const { data: clinic } = await supabase
    .from("clinics")
    .select("status")
    .eq("id", profile.clinic_id)
    .maybeSingle();

  if (clinic?.status === "suspended") return SUSPENDED_MESSAGE;

  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"password" | "google" | null>(null);

  const pending = pendingMode !== null;
  const error = localError ?? searchParams.get("error");

  const getSafeNextPath = () => {
    const rawNext = searchParams.get("next");
    if (!rawNext) return "/dashboard";
    if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return "/dashboard";
    return rawNext;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setPendingMode("password");
    setLocalError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setLocalError(authError.message);
        setPendingMode(null);
        return;
      }

      const blockMessage = await getPostLoginBlockReason(supabase);
      if (blockMessage) {
        await supabase.auth.signOut();
        setLocalError(blockMessage);
        setPendingMode(null);
        return;
      }

      startTransition(() => {
        router.replace(getSafeNextPath());
        router.refresh();
      });
    } catch (unexpectedError) {
      setLocalError(
        unexpectedError instanceof Error ? unexpectedError.message : "Unable to sign in right now.",
      );
      setPendingMode(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setPendingMode("google");
    setLocalError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", getSafeNextPath());

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          skipBrowserRedirect: true,
        },
      });

      if (authError) {
        setLocalError(authError.message);
        setPendingMode(null);
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setLocalError("Google sign-in did not return a redirect URL.");
      setPendingMode(null);
    } catch (unexpectedError) {
      setLocalError(
        unexpectedError instanceof Error ? unexpectedError.message : "Unable to start Google sign-in right now.",
      );
      setPendingMode(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        data-testid="login-google-button"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-primary/35 bg-surface px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary-container/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {pendingMode === "google"
          ? "Redirecting to Google..."
          : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="whitespace-nowrap">Or use email</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-on-surface">Email</span>
          <input
            data-testid="login-email-input"
            className="w-full rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            type="email"
            placeholder="clinician@bettercrm.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-on-surface">Password</span>
          <div className="relative">
            <input
              data-testid="login-password-input"
              className="w-full rounded-2xl border border-outline-variant/35 bg-surface-container-low py-3 pl-4 pr-12 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <button
          type="submit"
          data-testid="login-submit-button"
          className="btn-primary inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
        >
          {pendingMode === "password" ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? (
        <div
          data-testid="login-error"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : null}

    </div>
  );
}
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"password" | "google" | null>(null);

  const pending = pendingMode !== null;
  const error = localError ?? searchParams.get("error");

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

      startTransition(() => {
        router.replace("/dashboard");
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
      redirectTo.searchParams.set("next", "/dashboard");

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
        className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
      >
        {pendingMode === "google"
          ? "Redirecting to Google..."
          : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="whitespace-nowrap">Or use email</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            data-testid="login-email-input"
            className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            type="email"
            placeholder="clinician@bettercrm.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input
            data-testid="login-password-input"
            className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            required
          />
        </label>

        <button
          type="submit"
          data-testid="login-submit-button"
          className="btn-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
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

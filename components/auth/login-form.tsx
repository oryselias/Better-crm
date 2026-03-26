"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  disabled?: boolean;
};

export function LoginForm({ disabled = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"password" | "google" | null>(
    null,
  );

  const pending = pendingMode !== null;
  const error = localError ?? searchParams.get("error");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setPendingMode("password");
    setLocalError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setLocalError(authError.message);
        return;
      }

      startTransition(() => {
        router.replace("/dashboard");
        router.refresh();
      });
    } catch (unexpectedError) {
      setLocalError(
        unexpectedError instanceof Error
          ? unexpectedError.message
          : "Unable to sign in right now.",
      );
    } finally {
      setPendingMode(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (disabled) {
      return;
    }

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
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setLocalError("Google sign-in did not return a redirect URL.");
    } catch (unexpectedError) {
      setLocalError(
        unexpectedError instanceof Error
          ? unexpectedError.message
          : "Unable to start Google sign-in right now.",
      );
      setPendingMode(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending || disabled}
      >
        {pendingMode === "google" ? "Redirecting to Google..." : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
        <div className="h-px flex-1 bg-[var(--line)]" />
        <span>Or use email</span>
        <div className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/75 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            type="email"
            placeholder="clinician@bettercrm.app"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending || disabled}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input
            className="w-full rounded-2xl border border-[var(--line)] bg-white/75 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending || disabled}
            required
          />
        </label>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || disabled}
        >
          {pendingMode === "password" ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

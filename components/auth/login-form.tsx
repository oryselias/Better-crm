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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [pendingMode, setPendingMode] = useState<"password" | "google" | null>(null);

  const pending = pendingMode !== null;
  const error = localError ?? searchParams.get("error");

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setLocalError(null);
    setSignupSuccess(false);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;

    setPendingMode("password");
    setLocalError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) {
          setLocalError(authError.message);
          setPendingMode(null);
          return;
        }
        setSignupSuccess(true);
        setPendingMode(null);
        return;
      }

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
    if (disabled) return;

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

  if (signupSuccess) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary-container px-5 py-6 text-sm leading-7 text-on-surface">
        <p className="font-semibold text-primary">Check your email</p>
        <p className="mt-1 text-on-surface-variant">
          We sent a confirmation link to <span className="font-medium text-on-surface">{email}</span>.
          Click it to activate your account, then{" "}
          <button
            type="button"
            className="font-semibold text-primary underline"
            onClick={() => switchMode("signin")}
          >
            sign in here
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        data-testid="login-google-button"
        className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container px-4 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending || disabled}
      >
        {pendingMode === "google"
          ? "Redirecting to Google..."
          : mode === "signup"
            ? "Sign up with Google"
            : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span>Or use email</span>
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
            disabled={pending || disabled}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input
            data-testid="login-password-input"
            className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            type="password"
            placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Enter your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending || disabled}
            required
            minLength={mode === "signup" ? 6 : undefined}
          />
        </label>

        <button
          type="submit"
          data-testid="login-submit-button"
          className="btn-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || disabled}
        >
          {pendingMode === "password"
            ? mode === "signup" ? "Creating account..." : "Signing in..."
            : mode === "signup" ? "Create account" : "Sign in"}
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

      <p className="text-center text-sm text-on-surface-variant">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={() => switchMode("signup")}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

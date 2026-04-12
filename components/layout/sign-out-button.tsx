"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { LogOut } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ variant = "full" }: { variant?: "full" | "icon" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      startTransition(() => {
        router.replace("/login");
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface-variant transition hover:bg-error/10 hover:text-error hover:border-error/50 disabled:cursor-not-allowed disabled:opacity-50"
        title="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition hover:border-error/50 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
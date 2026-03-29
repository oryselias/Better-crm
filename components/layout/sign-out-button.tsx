"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
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

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition hover:border-error/50 hover:text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

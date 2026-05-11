import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { signOutAction } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.clinic_id) redirect("/dashboard");

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center gap-6">
        <div className="space-y-3 text-center">
          <p className="eyebrow text-primary">Access required</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">
            Your account isn&apos;t linked to a clinic yet
          </h1>
          <p className="text-base leading-7 text-on-surface-variant">
            Better CRM is invite-only. Ask your administrator to send you an
            invite link, or sign in with an account that already has clinic
            access.
          </p>
        </div>

        <div className="rounded-[2rem] border border-outline-variant/30 bg-surface p-6 text-sm">
          <p className="text-on-surface-variant">Signed in as</p>
          <p className="mt-1 font-medium">{user.email}</p>

          <form action={signOutAction} className="mt-5">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm font-semibold hover:bg-surface-container"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

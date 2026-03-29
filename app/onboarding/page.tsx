import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClinicAction } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If they already have a profile, skip onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (profile?.clinic_id) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col justify-center gap-8">
        <div className="space-y-3">
          <p className="eyebrow text-primary">Welcome to Better CRM</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Set up your clinic
          </h1>
          <p className="text-base leading-7 text-on-surface-variant">
            You&apos;re the first user — create your clinic workspace to get started.
            You&apos;ll be set as the admin.
          </p>
        </div>

        <div className="surface rounded-[2rem] border border-outline-variant/30 px-8 py-8">
          <form action={createClinicAction} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Clinic name</span>
              <input
                name="clinicName"
                type="text"
                placeholder="e.g. Aether Medical"
                required
                className="w-full rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 outline-none transition focus:border-primary-container focus:ring-2 focus:ring-primary-container/15"
              />
            </label>

            <button
              type="submit"
              className="btn-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Create clinic &amp; continue
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

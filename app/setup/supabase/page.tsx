import Link from "next/link";

import { getSupabaseVerificationSnapshot } from "@/lib/supabase/verification";

const statusStyles = {
  success: {
    badge: "border-emerald-600/15 bg-emerald-50 text-emerald-700",
    card: "border-emerald-600/12 bg-white/72",
    label: "Connected",
  },
  warning: {
    badge: "border-[var(--warning)]/15 bg-[var(--warning-soft)] text-[var(--warning)]",
    card: "border-[var(--warning)]/12 bg-white/72",
    label: "Needs input",
  },
  error: {
    badge: "border-red-200 bg-red-50 text-red-700",
    card: "border-red-200/70 bg-white/72",
    label: "Blocked",
  },
} as const;

export default async function SupabaseSetupPage() {
  const snapshot = await getSupabaseVerificationSnapshot();
  const allChecksPassing = snapshot.checks.every(
    (check) => check.status === "success",
  );

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="surface relative overflow-hidden rounded-[2rem] border border-[var(--line)] px-8 py-8 md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(20,32,51,0.1),_transparent_26%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="eyebrow">Supabase Verification</p>
              <div className="space-y-3">
                <h1
                  className="text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance md:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Verify the Better CRM project is connected before you seed data.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                  This page checks your local environment contract, server-side
                  access, database reachability, and hosted auth access without
                  exposing secrets to the browser.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--line)] bg-white/70 px-5 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Back to login
              </Link>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent)]"
              >
                Open Supabase dashboard
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface rounded-[2rem] border border-[var(--line)] p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="eyebrow">Connection Status</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                  {allChecksPassing
                    ? "Your Supabase project looks connected."
                    : "A few setup checks still need attention."}
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Project ref:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {snapshot.projectRef ?? "Not detected yet"}
                  </span>
                </p>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Project URL:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {snapshot.projectUrl ?? "Not configured yet"}
                  </span>
                </p>
              </div>
              <div
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                  allChecksPassing
                    ? statusStyles.success.badge
                    : statusStyles.warning.badge
                }`}
              >
                {allChecksPassing ? "Ready" : "Setup"}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {snapshot.checks.map((check) => {
                const styles = statusStyles[check.status];

                return (
                  <article
                    key={check.title}
                    className={`rounded-[1.5rem] border p-5 ${styles.card}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold tracking-[-0.02em]">
                        {check.title}
                      </h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}
                      >
                        {styles.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {check.detail}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="surface rounded-[2rem] border border-[var(--line)] p-6 md:p-8">
            <div className="space-y-4">
              <p className="eyebrow">What To Paste</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                Local `.env.local`
              </h2>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Add these values from your Supabase project settings, then
                refresh this page.
              </p>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-[var(--foreground)] p-5 text-sm text-white">
              <pre className="overflow-x-auto whitespace-pre-wrap leading-6">{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=`}</pre>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--muted)]">
              <p>
                After the checks turn green, create your first auth user and the
                matching `profiles` row before trying the dashboard.
              </p>
              <p>
                If login works but `/dashboard` still rejects you, that usually
                means the user exists in Auth but not in `public.profiles`.
              </p>
              <p>
                For Google authentication, enable the Google provider in
                Supabase and add your app callback URL:
                <code className="ml-1 font-semibold">
                  http://localhost:3000/auth/callback
                </code>
              </p>
              <p>
                Full setup notes live in{" "}
                <code>docs/integrations/supabase-setup.md</code>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const isConfigured = hasSupabasePublicEnv();

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface relative overflow-hidden rounded-[2rem] border border-outline-variant/30 px-8 py-10 md:px-12 md:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(20,32,51,0.12),_transparent_24%)]" />
          <div className="relative flex h-full flex-col justify-between gap-12">
            <div className="space-y-5">
              <p className="eyebrow">Clinic Operations OS</p>
              <div className="max-w-2xl space-y-4">
                <h1
                  className="text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance md:text-6xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Calm control for patients, appointments, and lab review.
                </h1>
                <p className="max-w-xl text-base leading-7 text-on-surface-variant md:text-lg">
                  Better CRM starts with clinic-scoped access, auditable report
                  ingestion, and a focused admin workspace that can grow into
                  messaging and billing without rewriting the foundation.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Clinic isolation", "Single-clinic auth and RLS from day one."],
                ["Traceable ingestion", "Raw files, parsed payloads, and review state stay linked."],
                ["Operator-ready UI", "A premium shell with room for real workflows, not demo clutter."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[1.5rem] border border-outline-variant/30 bg-surface-container p-5">
                  <p className="text-sm font-semibold tracking-[-0.02em]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface flex rounded-[2rem] border border-outline-variant/30 px-6 py-8 md:px-8">
          <div className="m-auto w-full max-w-md space-y-6">
            <div className="space-y-3">
              <p className="eyebrow">Clinic Access</p>
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em]">
                  Sign in or create an account
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Use Google or an email and password. New users can sign up
                  below — your clinic profile is linked after first login.
                </p>
              </div>
            </div>

            {!isConfigured ? (
              <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-5 text-sm leading-6 text-amber-400">
                Add the Supabase values from <code>.env.example</code> into a
                local env file before signing in. You can verify the connection
                at{" "}
                <Link href="/setup/supabase" className="font-semibold underline">
                  /setup/supabase
                </Link>
                .
              </div>
            ) : null}

            <Suspense>
              <LoginForm disabled={!isConfigured} />
            </Suspense>

            <div className="space-y-2 text-sm leading-6 text-on-surface-variant">
              <p>Sign-in requires:</p>
              <ul className="space-y-1">
                <li>
                  <code>NEXT_PUBLIC_SUPABASE_URL</code>
                </li>
                <li>
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                </li>
              </ul>
              <p>Hosted verification additionally uses:</p>
              <ul className="space-y-1">
                <li>
                  <code>SUPABASE_SERVICE_ROLE_KEY</code>
                </li>
              </ul>
              <p>
                For Google sign-in, enable the Google provider in Supabase Auth
                and add{" "}
                <code>{`/auth/callback`}</code> under your allowed redirect URLs.
              </p>
              <p>
                Need a connection check? Visit{" "}
                <Link href="/setup/supabase" className="font-semibold text-primary-container">
                  the Supabase verification page
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

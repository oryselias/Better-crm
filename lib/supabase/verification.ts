import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSupabaseProjectRef,
  hasSupabasePublicEnv,
  hasSupabaseServerEnv,
} from "@/lib/supabase/env";

type VerificationStatus = "success" | "warning" | "error";

type VerificationCheck = {
  title: string;
  status: VerificationStatus;
  detail: string;
};

export type SupabaseVerificationSnapshot = {
  projectRef: string | null;
  projectUrl: string | null;
  checks: VerificationCheck[];
};

export async function getSupabaseVerificationSnapshot(): Promise<SupabaseVerificationSnapshot> {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const checks: VerificationCheck[] = [
    {
      title: "Public app keys",
      status: hasSupabasePublicEnv() ? "success" : "error",
      detail: hasSupabasePublicEnv()
        ? "The browser URL and publishable key are available to the Next.js app."
        : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    },
    {
      title: "Server service role",
      status: hasSupabaseServerEnv() ? "success" : "warning",
      detail: hasSupabaseServerEnv()
        ? "Server-side verification can run against your hosted project."
        : "Add SUPABASE_SERVICE_ROLE_KEY to enable full server-side connection checks.",
    },
  ];

  if (!hasSupabasePublicEnv() || !hasSupabaseServerEnv()) {
    return {
      projectRef: getSupabaseProjectRef(),
      projectUrl,
      checks,
    };
  }

  try {
    const supabase = createSupabaseAdminClient();

    const [{ error: clinicError, count }, { error: authError, data: users }] =
      await Promise.all([
        supabase.from("clinics").select("id", { count: "exact", head: true }),
        supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        }),
      ]);

    checks.push({
      title: "Database reachability",
      status: clinicError ? "error" : "success",
      detail: clinicError
        ? clinicError.message
        : `Connected to the hosted database and read the clinics table metadata successfully${typeof count === "number" ? ` (${count} clinic records visible).` : "."}`,
    });

    checks.push({
      title: "Auth admin reachability",
      status: authError ? "error" : "success",
      detail: authError
        ? authError.message
        : `Connected to Supabase Auth successfully${users?.users.length ? ` and found at least ${users.users.length} user record.` : ", but no auth users exist yet."}`,
    });
  } catch (error) {
    checks.push({
      title: "Hosted project connection",
      status: "error",
      detail:
        error instanceof Error
          ? error.message
          : "Unable to reach the hosted Supabase project with the current environment values.",
    });
  }

  return {
    projectRef: getSupabaseProjectRef(),
    projectUrl,
    checks,
  };
}

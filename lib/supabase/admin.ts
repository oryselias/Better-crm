import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();

  if (!serviceRoleKey?.trim()) {
    throw new Error("Missing Supabase environment variables: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

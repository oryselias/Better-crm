import { redirect } from "next/navigation";

import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export default function HomePage() {
  redirect(hasSupabasePublicEnv() ? "/dashboard" : "/setup/supabase");
}

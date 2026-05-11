import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export function getSuperAdminEmail() {
  return process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? null;
}

export async function getCurrentUserWithRole() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, isSuperAdmin: false };

  const { data: role } = await supabase
    .from("user_roles")
    .select("system_role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user,
    isSuperAdmin: role?.system_role === "super_admin",
  };
}

export async function requireSuperAdmin() {
  const { user, isSuperAdmin } = await getCurrentUserWithRole();

  if (!user) redirect("/login");
  if (!isSuperAdmin) redirect("/dashboard?error=Forbidden");

  return user;
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SignupSchema = z.object({
  token: z.string().trim().uuid("Invalid invite token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function signupErrorRedirect(token: string, message: string): never {
  redirect(`/signup?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`);
}

export async function signupWithInviteAction(formData: FormData) {
  const rawToken = typeof formData.get("token") === "string" ? (formData.get("token") as string).trim() : "";

  const parsed = SignupSchema.safeParse({
    token: rawToken || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0].message;
    redirect(`/signup?token=${encodeURIComponent(rawToken)}&error=${encodeURIComponent(msg)}`);
  }

  const { token, password } = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, email, clinic_name, clinic_id, role, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    signupErrorRedirect(
      token,
      inviteError?.message ?? "Invite not found. Ask your admin for a new link.",
    );
  }

  if (invite.used_at) {
    signupErrorRedirect(token, "This invite has already been used.");
  }

  if (new Date(invite.expires_at) < new Date()) {
    signupErrorRedirect(token, "This invite has expired.");
  }

  // Claim the invite first to prevent race conditions/double submit.
  const claimedAt = new Date().toISOString();
  const { data: claimedInvite, error: claimError } = await admin
    .from("invites")
    .update({ used_at: claimedAt, used_by: null })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (claimError || !claimedInvite) {
    signupErrorRedirect(token, "This invite has already been used.");
  }

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (userError || !created?.user) {
    await admin.from("invites").update({ used_at: null, used_by: null }).eq("id", invite.id);
    const userErrorMessage = userError?.message ?? "Failed to create user.";
    redirect(
      `/signup?token=${encodeURIComponent(token)}&error=${encodeURIComponent(userErrorMessage)}`,
    );
  }

  const userId = created.user.id;

  let clinicId = invite.clinic_id;

  if (!clinicId) {
    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .insert({ name: invite.clinic_name as string })
      .select("id")
      .single();

    if (clinicError || !clinic) {
      await admin.from("invites").update({ used_at: null, used_by: null }).eq("id", invite.id);
      await admin.auth.admin.deleteUser(userId);
      redirect(
        `/signup?token=${encodeURIComponent(token)}&error=${encodeURIComponent(clinicError?.message ?? "Failed to create clinic.")}`,
      );
    }

    clinicId = clinic.id;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    clinic_id: clinicId,
    role: invite.role,
  });

  if (profileError) {
    await admin.from("invites").update({ used_at: null, used_by: null }).eq("id", invite.id);
    if (!invite.clinic_id && clinicId) {
      await admin.from("clinics").delete().eq("id", clinicId);
    }
    await admin.auth.admin.deleteUser(userId);
    redirect(
      `/signup?token=${encodeURIComponent(token)}&error=${encodeURIComponent(profileError.message)}`,
    );
  }

  const { error: markUsedError } = await admin
    .from("invites")
    .update({ used_by: userId })
    .eq("id", invite.id);

  if (markUsedError) {
    if (!invite.clinic_id && clinicId) {
      await admin.from("clinics").delete().eq("id", clinicId);
    }
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from("invites").update({ used_at: null, used_by: null }).eq("id", invite.id);
    redirect(
      `/signup?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Failed to finalize invite. Please try again.")}`,
    );
  }

  redirect(
    `/login?success=${encodeURIComponent("Account created. Please sign in with your email and password.")}`,
  );
}

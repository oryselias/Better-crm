import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminAuditAction =
  | "invite.create"
  | "invite.revoke"
  | "invite.reset_orphan"
  | "clinic.suspend"
  | "clinic.activate"
  | "clinic.delete";

/** Best-effort audit write — never throws; main admin action success is not blocked. */
export async function logAdminAction(input: {
  actorId: string;
  action: AdminAuditAction;
  targetType: "invite" | "clinic";
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("admin_audit_log").insert({
      actor_id: input.actorId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    });

    return !error;
  } catch {
    return false;
  }
}

"use client";

import {
  activateClinicAccountAction,
  deleteClinicAccountAction,
  suspendClinicAccountAction,
} from "@/app/admin/invites/actions";

type ClinicAccountActionsProps = {
  clinicId: string;
  clinicName: string;
  status: "active" | "trial" | "suspended";
};

export function ClinicAccountActions({ clinicId, clinicName, status }: ClinicAccountActionsProps) {
  const isSuspended = status === "suspended";

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <form action={isSuspended ? activateClinicAccountAction : suspendClinicAccountAction}>
        <input type="hidden" name="clinicId" value={clinicId} />
        <button
          type="submit"
          className="rounded-lg border border-outline-variant/30 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container"
        >
          {isSuspended ? "Activate" : "Suspend"}
        </button>
      </form>
      <form
        action={deleteClinicAccountAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Permanently delete "${clinicName}"?\n\nThis removes the clinic, all patients, lab reports, and user accounts. The owner can sign up again with a new invite, but history will be gone.`,
          );
          if (!confirmed) event.preventDefault();
        }}
      >
        <input type="hidden" name="clinicId" value={clinicId} />
        <button
          type="submit"
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
        >
          Delete
        </button>
      </form>
    </div>
  );
}

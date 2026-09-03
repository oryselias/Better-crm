"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateClinicStatusAction, deleteClinicAction } from "../actions";

export function StatusSwitcher({
  clinicId,
  clinicName,
  currentStatus,
}: {
  clinicId: string;
  clinicName?: string;
  currentStatus: "active" | "trial" | "suspended";
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleStatusChange = (newStatus: "active" | "trial" | "suspended") => {
    if (newStatus === status) return;
    if (newStatus === "suspended") {
      const confirmed = window.confirm(
        "Are you sure you want to suspend this clinic? All clinic staff members will lose access to CRM operations."
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("clinicId", clinicId);
      formData.set("status", newStatus);

      const result = await updateClinicStatusAction(formData);
      if (result.success) {
        setStatus(newStatus);
        setMessage({ text: `Clinic status changed to ${newStatus}`, type: "success" });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ text: result.error ?? "Failed to update status", type: "error" });
        setTimeout(() => setMessage(null), 5000);
      }
    });
  };

  const handleDeleteClinic = async () => {
    if (confirmInput.trim().toUpperCase() !== "DELETE") return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const formData = new FormData();
      formData.set("clinicId", clinicId);

      const result = await deleteClinicAction(formData);
      if (result.success) {
        setIsDeleteModalOpen(false);
        const nameParam = encodeURIComponent(result.clinicName ?? clinicName ?? "Clinic");
        router.push(`/admin/clinics?deleted=${nameParam}`);
      } else {
        setDeleteError(result.error ?? "Failed to delete clinic");
        setIsDeleting(false);
      }
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "An unexpected error occurred while deleting.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 rounded-2xl bg-surface-container-low p-1.5 border border-outline-variant/30">
          <button
            type="button"
            disabled={isPending || isDeleting}
            onClick={() => handleStatusChange("active")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              status === "active"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-on-surface-variant hover:text-emerald-500 hover:bg-surface"
            } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Active
          </button>
          <button
            type="button"
            disabled={isPending || isDeleting}
            onClick={() => handleStatusChange("trial")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              status === "trial"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-on-surface-variant hover:text-amber-500 hover:bg-surface"
            } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Trial
          </button>
          <button
            type="button"
            disabled={isPending || isDeleting}
            onClick={() => handleStatusChange("suspended")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              status === "suspended"
                ? "bg-red-500 text-white shadow-sm"
                : "text-on-surface-variant hover:text-red-400 hover:bg-surface"
            } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Suspended
          </button>
          <div className="h-4 w-px bg-outline-variant/30 mx-0.5" />
          <button
            type="button"
            disabled={isPending || isDeleting}
            onClick={() => {
              setConfirmInput("");
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500 transition-all shadow-none cursor-pointer"
            title="Permanently Delete Clinic"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>

        {message && (
          <p
            className={`text-xs font-medium ${
              message.type === "success" ? "text-emerald-500" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-on-surface">Permanently Delete Clinic?</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  You are about to delete <span className="font-semibold text-on-surface">{clinicName ?? "this clinic"}</span>. This action is irreversible and will permanently delete all associated data.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 space-y-2.5 text-xs text-on-surface-variant">
              <p className="font-semibold text-on-surface">The following will be permanently erased:</p>
              <ul className="list-disc pl-5 space-y-1 text-on-surface-variant/90">
                <li>All lab reports, tests, and medical records for this clinic</li>
                <li>All registered patient records</li>
                <li>All staff accounts & login credentials (staff must create a new account to rejoin)</li>
                <li>Custom letterhead templates and clinic settings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-delete-input" className="block text-xs font-semibold text-on-surface">
                To confirm, type <span className="font-mono text-red-400 font-bold">DELETE</span> below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                disabled={isDeleting}
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container px-3.5 py-2.5 text-xs font-mono text-on-surface outline-none focus:border-red-500 placeholder:text-on-surface-variant/50"
              />
            </div>

            {deleteError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-medium text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (!isDeleting) setIsDeleteModalOpen(false);
                }}
                className="rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput.trim().toUpperCase() !== "DELETE" || isDeleting}
                onClick={handleDeleteClinic}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all ${
                  confirmInput.trim().toUpperCase() === "DELETE" && !isDeleting
                    ? "bg-red-500 hover:bg-red-600 cursor-pointer shadow-red-500/20"
                    : "bg-red-500/40 cursor-not-allowed text-white/60"
                }`}
              >
                {isDeleting ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Deleting Clinic...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Permanently Delete Clinic
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

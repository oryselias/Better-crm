"use client";

import { useState, useTransition } from "react";
import { updateClinicStatusAction } from "../actions";

export function StatusSwitcher({
  clinicId,
  currentStatus,
}: {
  clinicId: string;
  currentStatus: "active" | "trial" | "suspended";
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 rounded-2xl bg-surface-container-low p-1.5 border border-outline-variant/30">
        <button
          type="button"
          disabled={isPending}
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
          disabled={isPending}
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
          disabled={isPending}
          onClick={() => handleStatusChange("suspended")}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            status === "suspended"
              ? "bg-red-500 text-white shadow-sm"
              : "text-on-surface-variant hover:text-red-400 hover:bg-surface"
          } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Suspended
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
  );
}

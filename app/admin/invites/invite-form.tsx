"use client";

import { useState } from "react";
import { createInviteAction } from "./actions";

export function InviteForm({
  clinics,
}: {
  clinics: { id: string; name: string; status: string }[];
}) {
  const [inviteType, setInviteType] = useState<"new" | "existing">("new");

  return (
    <section className="rounded-3xl border border-outline-variant/30 bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-on-surface">Create New Invite</h2>
          <p className="text-xs text-on-surface-variant">
            Generate an onboarding link for a new clinic or invite a staff member to an existing clinic
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-surface-container-low p-1 border border-outline-variant/30 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setInviteType("new")}
            className={`rounded-xl px-3 py-1.5 transition-all ${
              inviteType === "new"
                ? "bg-surface text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            New Clinic
          </button>
          <button
            type="button"
            onClick={() => setInviteType("existing")}
            className={`rounded-xl px-3 py-1.5 transition-all ${
              inviteType === "existing"
                ? "bg-surface text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Existing Clinic Staff
          </button>
        </div>
      </div>

      <form action={createInviteAction} className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1.4fr_0.8fr_auto] md:items-end">
        <input type="hidden" name="inviteType" value={inviteType} />

        {/* Email */}
        <label className="space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">Recipient Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder={inviteType === "new" ? "owner@newclinic.com" : "technician@clinic.com"}
            className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary text-on-surface"
          />
        </label>

        {/* Clinic target */}
        {inviteType === "new" ? (
          <label className="space-y-1">
            <span className="text-xs font-medium text-on-surface-variant">New Clinic Name</span>
            <input
              name="clinicName"
              type="text"
              required
              placeholder="e.g. Apex Diagnostics & Lab"
              className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary text-on-surface"
            />
          </label>
        ) : (
          <label className="space-y-1">
            <span className="text-xs font-medium text-on-surface-variant">Select Existing Clinic</span>
            <select
              name="clinicId"
              required
              defaultValue={clinics[0]?.id ?? ""}
              className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary text-on-surface"
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Role */}
        <label className="space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">Assign Role</span>
          <select
            name="role"
            defaultValue={inviteType === "new" ? "admin" : "lab_staff"}
            className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary text-on-surface"
          >
            <option value="admin">Admin</option>
            <option value="lab_staff">Lab Staff</option>
            <option value="clinician">Clinician</option>
          </select>
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold shadow-sm"
        >
          Generate Invite
        </button>
      </form>
    </section>
  );
}

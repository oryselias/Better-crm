"use client";

import { CalendarPlus, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { createAppointment } from "@/app/(dashboard)/appointments/actions";

type Patient = { id: string; full_name: string };

export function NewAppointmentDialog({ patients }: { patients: Patient[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createAppointment(formData);
        formRef.current?.reset();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-[0_0_15px_rgba(0,242,255,0.2)]"
      >
        <CalendarPlus className="h-4 w-4" />
        New Appointment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="surface w-full max-w-md rounded-[2rem] border border-outline-variant/30 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-on-surface">
                New Appointment
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={submit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">Patient</span>
                <select
                  name="patient_id"
                  required
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">Select patient…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-on-surface">Date</span>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-on-surface">Time</span>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="09:00"
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Reason for visit, instructions…"
                  className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </label>

              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-outline-variant/30 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Book Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

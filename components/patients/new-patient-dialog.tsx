"use client";

import { UserPlus, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { createPatient } from "@/app/(dashboard)/patients/actions";

export function NewPatientDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createPatient(formData);
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
        <UserPlus className="h-4 w-4" />
        Add Patient
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="surface w-full max-w-md rounded-[2rem] border border-outline-variant/30 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-on-surface">
                Add Patient
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
                <span className="text-sm font-medium text-on-surface">
                  Full Name <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-on-surface">Date of Birth</span>
                  <input
                    type="date"
                    name="date_of_birth"
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-on-surface">Sex</span>
                  <select
                    name="sex"
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">Email</span>
                <input
                  type="email"
                  name="email"
                  placeholder="patient@example.com"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">Phone / WhatsApp</span>
                <input
                  type="tel"
                  name="whatsapp_number"
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                  {isPending ? "Saving…" : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

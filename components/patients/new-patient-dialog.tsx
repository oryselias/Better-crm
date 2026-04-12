"use client";

import { UserPlus, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { createPatient } from "@/app/(dashboard)/patients/actions";
import { isValidPatientPhone } from "@/lib/patients/phone";

export function NewPatientDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    submit(formData);
  }

  function submit(formData: FormData) {
    const rawPhone = formData.get("phone") as string;
    if (rawPhone && !isValidPatientPhone(rawPhone)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

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
        data-testid="patients-add-button"
        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
      >
        <UserPlus className="h-4 w-4" />
        Add Patient
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div
            data-testid="patients-dialog"
            className="surface w-full max-w-md rounded-lg border border-outline-variant/30 p-6 shadow-md"
          >
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

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">
                  Full Name <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  name="full_name"
                  data-testid="patients-name-input"
                  required
                  placeholder="Jane Doe"
                  className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-on-surface">Age</span>
                  <input
                    type="number"
                    name="age"
                    data-testid="patients-age-input"
                    min="0"
                    max="150"
                    placeholder="25"
                    className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-on-surface">Sex</span>
                  <select
                    name="sex"
                    data-testid="patients-sex-input"
                    className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">Phone</span>
                <input
                  type="tel"
                  name="phone"
                  data-testid="patients-phone-input"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="9876543210"
                  onChange={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </label>

              {error && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md border border-outline-variant/30 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="patients-submit-button"
                  disabled={isPending}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
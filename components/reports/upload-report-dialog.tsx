"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { uploadReport } from "@/app/(dashboard)/reports/actions";

type Patient = { id: string; full_name: string };

export function UploadReportDialog({ patients }: { patients: Patient[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadReport(formData);
        formRef.current?.reset();
        setFileName(null);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-[0_0_15px_rgba(0,242,255,0.2)]"
      >
        <Upload className="h-4 w-4" />
        Upload Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="surface w-full max-w-md rounded-[2rem] border border-outline-variant/30 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-on-surface">
                Upload Lab Report
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
                  Patient <span className="text-on-surface-variant font-normal">(optional)</span>
                </span>
                <select
                  name="patient_id"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">Unassigned</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-surface">Report File</span>
                <div className="relative">
                  <input
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-lowest px-4 py-5 text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface transition-colors">
                    <Upload className="h-4 w-4 shrink-0" />
                    {fileName ?? "Choose PDF or image…"}
                  </div>
                </div>
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
                  {isPending ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

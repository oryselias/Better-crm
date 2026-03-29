"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "checked_in", label: "Checked In" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function StatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  function set(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.replace(`/appointments?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          onClick={() => set(s.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            current === s.value
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

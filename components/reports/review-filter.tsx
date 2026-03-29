"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATES = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "rejected", label: "Rejected" },
];

export function ReviewFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("state") ?? "";

  function set(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("state", value);
    else params.delete("state");
    router.replace(`/reports?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1">
      {STATES.map((s) => (
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

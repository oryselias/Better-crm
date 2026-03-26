import { ArrowUpRight } from "lucide-react";

import type { DashboardMetric } from "@/lib/types";

type MetricCardProps = {
  metric: DashboardMetric;
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/60 bg-white/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
            {metric.value}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{metric.copy}</p>
    </div>
  );
}

import { ArrowUpRight } from "lucide-react";

import type { DashboardMetric } from "@/lib/types";

type MetricCardProps = {
  metric: DashboardMetric;
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-outline-variant/30 bg-surface-container-lowest p-5 transition-transform hover:scale-[1.02] hover:bg-surface-container hover:shadow-[0_0_30px_rgba(0,242,255,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-on-surface-variant">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-on-surface">
            {metric.value}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant/80">{metric.copy}</p>
    </div>
  );
}

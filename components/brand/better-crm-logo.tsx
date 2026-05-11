import type { HTMLAttributes } from "react";

type BetterCrmLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
} & HTMLAttributes<HTMLSpanElement>;

const sizeClass = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl tracking-[-0.03em]",
} as const;

/** “Better” (neutral) + “CRM” (primary) — matches Stitch clinic sign-in branding */
export function BetterCrmLogo({ size = "md", className = "", ...rest }: BetterCrmLogoProps) {
  return (
    <span
      className={`inline-block font-semibold tracking-tight ${sizeClass[size]} ${className}`}
      {...rest}
    >
      <span className="text-on-surface">Better</span>
      <span className="text-primary">CRM</span>
    </span>
  );
}

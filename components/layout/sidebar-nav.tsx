"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  CalendarRange,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: ActivitySquare },
  { href: "/appointments", label: "Appointments", icon: CalendarRange },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/audit", label: "Audit Log", icon: ShieldCheck },
  { href: "/billing", label: "Billing", icon: Wallet },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5 px-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
              isActive
                ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container shadow-[inset_2px_0_0_0_var(--color-primary-container)]"
                : "text-on-surface-variant/80 hover:text-primary hover:bg-surface-lowest/50 hover:pl-5"
            }`}
          >
            <Icon
              className={`h-4 w-4 transition-transform duration-300 ${
                isActive ? "scale-110" : "group-hover:scale-110"
              }`}
            />
            <span className="tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { navItems } from "./sidebar-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

type MobileNavProps = {
  userEmail: string;
};

export function MobileNav({ userEmail }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  };

  return (
    <div className="xl:hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between bg-surface rounded-2xl px-4 sm:px-5 py-4 border border-[var(--color-surface-container-highest)] shadow-[var(--shadow-card)] mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tighter text-on-surface">
            Better CRM
          </h1>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5 truncate max-w-[150px] sm:max-w-full">
            {userEmail}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="p-2 sm:-mr-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Fixed Bottom Navigation (Footer) */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-[var(--color-surface-container-highest)] pb-[env(safe-area-inset-bottom)]">
        <nav className="flex items-center justify-around px-2 pt-2 pb-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 flex-1 ${
                  isActive
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <div
                  className={`flex h-8 w-16 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-primary-container" : "bg-transparent"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isActive ? "text-primary" : "text-on-surface-variant"
                    }`}
                  />
                </div>
                <span
                  className={`mt-1 text-[11px] font-medium tracking-wide ${
                    isActive ? "text-on-surface font-semibold" : "text-on-surface-variant"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

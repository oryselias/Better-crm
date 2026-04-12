"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { navItems } from "./sidebar-nav";

export function MobileNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <div className="xl:hidden">
      {/* Top Header */}
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-outline-variant/30 bg-surface/90 px-3 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tighter text-on-surface">Better CRM</h1>
            <p className="mt-0.5 text-[10px] font-semibold tracking-widest text-primary uppercase truncate max-w-[160px] sm:max-w-none">
              {userEmail}
            </p>
          </div>
          <SignOutButton variant="icon" />
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/30 bg-surface/90 pb-2 pt-2 sm:pb-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-around px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-[80px] flex-col items-center justify-center gap-1 rounded-xl p-2 transition-all active:scale-95 ${
                  isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <div className={`flex items-center justify-center rounded-2xl px-4 py-1 transition-colors ${
                  isActive ? "bg-primary-container/60 text-primary" : "bg-transparent"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
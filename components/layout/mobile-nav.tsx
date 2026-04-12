"use client";

import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";
import { Menu, X } from "lucide-react";

type MobileNavProps = {
  userEmail: string;
};

export function MobileNav({ userEmail }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="xl:hidden">
      {/* Top Bar for Mobile */}
      <div className="flex items-center justify-between surface rounded-2xl px-5 py-4 border border-outline-variant/40 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-on-surface">
            Better CRM
          </h1>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">
            Lab Workflow
          </p>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="surface rounded-2xl border border-outline-variant/40 mb-6 p-4 animate-fade-in shadow-lg">
          <SidebarNav />
          <div className="mt-6 pt-4 border-t border-outline-variant/30 space-y-3">
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/40">
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                Signed in
              </p>
              <p className="mt-1 text-xs font-semibold text-primary truncate">{userEmail}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Shared by Admin/Restaurant/Customer portal layouts — a fixed-width sidebar (`w-60`) with no
 * mobile handling at all used to be permanently visible, eating most of a phone's screen width
 * (240px of ~375px) for every portal page at once. Below `md`, this is now a slide-in drawer
 * behind a hamburger button instead, closing itself on navigation or backdrop tap; at `md` and
 * above it renders exactly as it always did — nothing about the desktop layout changed.
 */
export function PortalNav({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false); // navigating anywhere closes the mobile drawer, same as tapping a link normally would elsewhere
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/">
          <Logo />
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 -translate-x-full flex-col border-r border-slate-200 bg-white p-4 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Logo />
            <p className="mt-1 text-xs font-medium text-slate-500">{title}</p>
            <p className="truncate text-xs text-slate-400">{user?.fullName}</p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-slate-400 hover:text-slate-600 md:hidden">
            ✕
          </button>
        </div>
        <ul className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          onClick={() => logout()}
          className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </nav>
    </>
  );
}

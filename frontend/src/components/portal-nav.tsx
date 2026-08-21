"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

export interface NavItem {
  href: string;
  label: string;
}

export function PortalNav({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <div className="mb-6">
        <Logo />
        <p className="mt-1 text-xs font-medium text-slate-500">{title}</p>
        <p className="truncate text-xs text-slate-400">{user?.fullName}</p>
      </div>
      <ul className="flex-1 space-y-1">
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
  );
}

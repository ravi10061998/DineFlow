"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ITEMS = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/restaurants", icon: "🔎", label: "Browse" },
  { href: "/orders", icon: "🧾", label: "Orders" },
  { href: "/cart", icon: "🛒", label: "Cart" },
  { href: "/profile", icon: "👤", label: "Profile" },
] as const;

/** Sticky bottom nav, mobile only — hidden entirely for non-customer roles (they use the desktop portal nav). */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (user && user.role !== "CUSTOMER") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white sm:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-orange-600" : "text-slate-500"}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

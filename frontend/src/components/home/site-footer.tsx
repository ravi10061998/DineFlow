"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white pb-20 sm:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700 p-6 text-center text-white sm:p-8">
          <p className="text-lg font-bold sm:text-xl">Get the DineFlow app</p>
          <p className="mt-1 text-sm text-orange-50">Order faster with push notifications and saved addresses.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <span className="cursor-not-allowed rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-white/30">
              App Store — Coming soon
            </span>
            <span className="cursor-not-allowed rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-white/30">
              Google Play — Coming soon
            </span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-slate-500">Order from restaurants near you.</p>
          </div>
          <FooterColumn title="Explore" links={[{ href: "/restaurants", label: "Restaurants" }, { href: "/blogs", label: "Food blog" }]} />
          <FooterColumn title="Account" links={[{ href: "/orders", label: "Your orders" }, { href: "/favorites", label: "Favorites" }, { href: "/profile", label: "Profile" }]} />
          <FooterColumn title="Partner" links={[{ href: "/register-restaurant", label: "Register your restaurant" }]} />
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} DineFlow.</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-500 hover:text-slate-900">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

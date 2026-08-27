import type { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PortalNav } from "@/components/portal-nav";

// A route group (parens don't affect the URL) — /profile, /orders, /favorites keep their exact
// existing paths, every existing link to them elsewhere in the app (site header, mobile bottom
// nav, order-confirmation redirects) keeps working unchanged. Only the shared chrome is new:
// same sidebar-portal shape as Admin/Restaurant, replacing each page's own ad hoc <header>.
const NAV_ITEMS = [
  { href: "/profile", label: "Dashboard" },
  { href: "/orders", label: "My Orders" },
  { href: "/favorites", label: "Favorites" },
];

export default function CustomerPortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["CUSTOMER"]}>
      <div className="flex min-h-screen bg-slate-50">
        <PortalNav title="My Account" items={NAV_ITEMS} />
        <main className="flex-1 overflow-x-auto p-8">{children}</main>
      </div>
    </RequireAuth>
  );
}

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PortalNav } from "@/components/portal-nav";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/subscription-plans", label: "Subscription Plans" },
  { href: "/admin/roles", label: "Roles & Permissions" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <div className="flex min-h-screen bg-slate-50">
        <PortalNav title="Admin Portal" items={NAV_ITEMS} />
        <main className="flex-1 overflow-x-auto p-8">{children}</main>
      </div>
    </RequireAuth>
  );
}

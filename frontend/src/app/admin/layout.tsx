import type { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PortalNav } from "@/components/portal-nav";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/restaurants", label: "Restaurants" },
  { href: "/admin/delivery-partners", label: "Delivery Partners" },
  { href: "/admin/delivery-assignments", label: "Delivery Assignments" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/webhooks", label: "Webhooks" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/settlements", label: "Settlements" },
  { href: "/admin/payouts", label: "Payouts" },
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

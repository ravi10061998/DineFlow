import type { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";
import { PortalNav } from "@/components/portal-nav";

const NAV_ITEMS = [
  { href: "/restaurant", label: "Dashboard" },
  { href: "/restaurant/analytics", label: "Analytics" },
  { href: "/restaurant/categories", label: "Menu Categories" },
  { href: "/restaurant/products", label: "Products" },
  { href: "/restaurant/orders", label: "Orders" },
  { href: "/restaurant/reviews", label: "Reviews" },
  { href: "/restaurant/ledger", label: "Ledger" },
  { href: "/restaurant/settlements", label: "Settlements" },
  { href: "/restaurant/payouts", label: "Payouts" },
  { href: "/restaurant/bank-account", label: "Bank Account" },
  { href: "/restaurant/subscription", label: "Subscription" },
];

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["RESTAURANT_ADMIN", "RESTAURANT_STAFF"]}>
      <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
        <PortalNav title="Restaurant Portal" items={NAV_ITEMS} />
        <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
      </div>
    </RequireAuth>
  );
}

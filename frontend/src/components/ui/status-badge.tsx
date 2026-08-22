const COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  ACTIVE: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
  BLOCKED: "bg-slate-800 text-white",
  TRIAL: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-red-100 text-red-800",
  CANCELLED: "bg-slate-200 text-slate-700",
  PAST_DUE: "bg-orange-100 text-orange-800",
  PLACED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  READY: "bg-violet-100 text-violet-800",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-800",
  DELIVERED: "bg-green-100 text-green-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-slate-200 text-slate-700",
  CREATED: "bg-amber-100 text-amber-800",
  SUCCEEDED: "bg-green-100 text-green-800",
  ASSIGNED: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-indigo-100 text-indigo-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

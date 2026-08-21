const ACCENT_CLASSES = {
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
} as const;

export type StatAccent = keyof typeof ACCENT_CLASSES;

export function StatCard({ label, value, accent }: { label: string; value: number | string; accent: StatAccent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <span className={`h-2.5 w-2.5 rounded-full ring-4 ${ACCENT_CLASSES[accent]}`} />
      </div>
    </div>
  );
}

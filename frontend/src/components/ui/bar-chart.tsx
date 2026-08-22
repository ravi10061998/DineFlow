/**
 * A minimal, dependency-free bar chart — no charting library exists in this
 * stack, and pulling one in for a handful of admin/restaurant dashboard
 * charts isn't worth the weight. Bars are pure CSS, height-scaled to the
 * largest value in the series.
 */
export function BarChart({ points, label }: { points: { label: string; value: number }[]; label: string }) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-400">No data for this period yet.</p>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div>
      <div className="flex h-40 gap-1">
        {points.map((p, i) => (
          <div key={i} className="group relative h-40 flex-1" title={`${p.label}: ${p.value}`}>
            <div
              className="absolute right-0 bottom-0 left-0 rounded-t bg-orange-400 transition-colors group-hover:bg-orange-500"
              style={{ height: `${Math.max((p.value / max) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{points[0]?.label}</span>
        <span>{label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { AuditLog } from "@/lib/audit-log-types";
import { ErrorBanner } from "@/components/ui/error-banner";
import { TextField } from "@/components/ui/text-field";

const METHOD_COLORS: Record<string, string> = {
  POST: "bg-blue-100 text-blue-800",
  PATCH: "bg-amber-100 text-amber-800",
  PUT: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-800",
};

export default function AdminAuditLogsPage() {
  const [pathFilter, setPathFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const { data: logs, loading, error } = useApiQuery(() => {
    const params = new URLSearchParams();
    if (pathFilter) params.set("path", pathFilter);
    if (methodFilter) params.set("method", methodFilter);
    const qs = params.toString();
    return api.get<AuditLog[]>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  }, [pathFilter, methodFilter]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every authenticated mutating request platform-wide (who, what, when) — the last 500, most recent first.
        Login/refresh/password flows are excluded (authentication plumbing, not business actions).
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:max-w-md">
        <TextField label="Filter by path" placeholder="e.g. /admin/coupons" value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Method</label>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">All</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <ErrorBanner message={error} />
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No matching audit log entries.
                  </td>
                </tr>
              )}
              {logs?.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {log.actorEmail}
                    <span className="ml-1 text-xs text-slate-400">({log.actorRole})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_COLORS[log.method] ?? "bg-slate-100 text-slate-700"}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-slate-600">{log.path}</code>
                  </td>
                  <td className="px-4 py-3">
                    {log.success ? (
                      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Success</span>
                    ) : (
                      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800" title={log.errorMessage ?? undefined}>
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

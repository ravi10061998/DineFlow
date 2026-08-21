"use client";

import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { ErrorBanner } from "@/components/ui/error-banner";

interface Permission {
  id: string;
  key: string;
  description: string;
  module: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
}

export default function AdminRolesPage() {
  const { data: roles, loading, error } = useApiQuery(() => api.get<Role[]>("/admin/roles"));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Roles & Permissions</h1>
      <p className="mt-1 text-sm text-slate-500">
        System roles (ADMIN, RESTAURANT_ADMIN, etc.) can&apos;t be deleted or renamed. Custom role creation and
        permission editing UI lands alongside whichever module first needs it.
      </p>
      <ErrorBanner message={error} />
      {loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 space-y-4">
          {roles?.map((role) => (
            <div key={role.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">{role.name}</h2>
                {role.isSystem && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">system</span>
                )}
              </div>
              {role.description && <p className="mt-1 text-sm text-slate-500">{role.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.length === 0 && <span className="text-xs text-slate-400">No permissions assigned</span>}
                {role.permissions.map((p) => (
                  <span key={p.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700" title={p.description}>
                    {p.key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

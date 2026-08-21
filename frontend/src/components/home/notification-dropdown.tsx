"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { AppNotification } from "@/lib/notification-types";

export function NotificationDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const enabled = user?.role === "CUSTOMER";

  useEffect(() => {
    if (!enabled) return;
    api
      .get<AppNotification[]>("/customer/me/notifications")
      .then(setNotifications)
      .catch(() => setError("Couldn't load notifications."));
  }, [enabled]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!enabled) return null;

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  async function markRead(id: string) {
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? prev);
    try {
      await api.patch(`/customer/me/notifications/${id}/read`);
    } catch {
      // Best-effort — a failed mark-as-read just means it'll still show unread next load.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-slate-100"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">Notifications</p>
          {error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : !notifications ? (
            <p className="p-4 text-sm text-slate-400">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`block w-full border-b border-slate-50 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 ${
                      n.isRead ? "" : "bg-orange-50/60"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

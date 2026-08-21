"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { getErrorMessage } from "@/lib/errors";
import type { Category } from "@/lib/category-types";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ErrorBanner } from "@/components/ui/error-banner";

export default function RestaurantCategoriesPage() {
  const { data: categories, loading, error, reload, setData } = useApiQuery(() =>
    api.get<Category[]>("/restaurant/me/categories"),
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await api.post("/restaurant/me/categories", { name, description: description || undefined });
      setName("");
      setDescription("");
      reload();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
    setActionError(null);
  }

  async function saveEdit(id: string) {
    setActionError(null);
    setBusyId(id);
    try {
      await api.patch(`/restaurant/me/categories/${id}`, { name: editName, description: editDescription || undefined });
      setEditingId(null);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(category: Category) {
    setActionError(null);
    setBusyId(category.id);
    try {
      await api.patch(`/restaurant/me/categories/${category.id}`, { isActive: !category.isActive });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setActionError(null);
    setBusyId(category.id);
    try {
      await api.delete(`/restaurant/me/categories/${category.id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!categories) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setData(reordered); // optimistic reorder, reconciled by the reload below

    setActionError(null);
    try {
      await api.put("/restaurant/me/categories/reorder", { orderedIds: reordered.map((c) => c.id) });
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
      reload(); // roll back to the server's actual order
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Menu Categories</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organize your menu into sections (Starters, Main Course, Desserts…) before adding items to them.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex-1">
          <TextField label="New category" placeholder="e.g. Starters" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex-1">
          <TextField
            label="Description (optional)"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="submit" loading={creating}>
          Add
        </Button>
      </form>
      <ErrorBanner message={createError} />
      <ErrorBanner message={error ?? actionError} />

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : categories?.length === 0 ? (
        <p className="text-slate-400">No categories yet — add your first one above.</p>
      ) : (
        <ul className="space-y-2">
          {categories?.map((category, index) => (
            <li key={category.id} className="rounded-lg border border-slate-200 bg-white p-4">
              {editingId === category.id ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <TextField label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  </div>
                  <Button loading={busyId === category.id} onClick={() => saveEdit(category.id)}>
                    Save
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        aria-label="Move down"
                        disabled={index === (categories?.length ?? 0) - 1}
                        onClick={() => move(index, 1)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    <div>
                      <p className={`font-medium ${category.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>
                        {category.name}
                      </p>
                      {category.description && <p className="text-sm text-slate-500">{category.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => startEdit(category)}>
                      Edit
                    </Button>
                    <Button variant="secondary" loading={busyId === category.id} onClick={() => toggleActive(category)}>
                      {category.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="danger" loading={busyId === category.id} onClick={() => remove(category)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

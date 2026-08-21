"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { BlogCategory, PaginatedBlogs } from "@/lib/home-types";
import { Logo } from "@/components/logo";
import { ErrorBanner } from "@/components/ui/error-banner";
import { BlogCard } from "@/components/home/blog-card";
import { Button } from "@/components/ui/button";

export default function BlogsPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | null>(null);

  const { data: categories } = useApiQuery(() => api.get<BlogCategory[]>("/store/blogs/categories"));
  const {
    data: blogs,
    loading,
    error,
    reload,
  } = useApiQuery(
    () => api.get<PaginatedBlogs>(`/store/blogs?page=${page}${category ? `&category=${category}` : ""}`),
    [page, category],
  );

  function selectCategory(slug: string | null) {
    setCategory(slug);
    setPage(1);
  }

  const totalPages = blogs ? Math.max(1, Math.ceil(blogs.total / blogs.pageSize)) : 1;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          Back to home
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Food blog</h1>
        <p className="mt-1 text-sm text-slate-500">Recipes, guides, and stories from DineFlow.</p>

        {categories && categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className={`rounded-full border px-3 py-1 text-sm ${!category ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCategory(c.slug)}
                className={`rounded-full border px-3 py-1 text-sm ${category === c.slug ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <ErrorBanner message={error} />

        {loading ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : blogs?.items.length === 0 ? (
          <p className="mt-6 text-slate-400">No articles published in this category yet.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {blogs?.items.map((b) => (
                <div key={b.id} className="w-full">
                  <BlogCard blog={b} />
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="mt-4">
            <Button variant="secondary" onClick={reload}>
              Retry
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

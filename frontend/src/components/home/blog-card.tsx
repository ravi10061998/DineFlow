"use client";

import Link from "next/link";
import type { Blog } from "@/lib/home-types";
import { StoreImage } from "./store-image";

export function BlogCard({ blog }: { blog: Blog }) {
  return (
    <Link
      href={`/blogs/${blog.slug}`}
      className="block w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <StoreImage src={blog.coverImageUrl} alt={blog.title} className="h-32 w-full object-cover" />
      <div className="p-3">
        {blog.category && (
          <span className="text-[11px] font-semibold tracking-wide text-orange-600 uppercase">{blog.category.name}</span>
        )}
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900">{blog.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          {blog.authorName} · {blog.readingTimeMinutes} min read
        </p>
      </div>
    </Link>
  );
}

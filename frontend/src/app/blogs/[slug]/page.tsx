"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import type { Blog } from "@/lib/home-types";
import { Logo } from "@/components/logo";
import { ErrorBanner } from "@/components/ui/error-banner";
import { StoreImage } from "@/components/home/store-image";

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: blog, loading, error } = useApiQuery(() => api.get<Blog>(`/store/blogs/${slug}`), [slug]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/blogs" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          All articles
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <ErrorBanner message={error} />

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : !blog ? (
          <p className="text-slate-400">This article couldn&apos;t be found.</p>
        ) : (
          <article>
            <StoreImage src={blog.coverImageUrl} alt={blog.title} className="h-56 w-full rounded-xl object-cover sm:h-72" />
            {blog.category && (
              <span className="mt-4 inline-block text-xs font-semibold tracking-wide text-orange-600 uppercase">{blog.category.name}</span>
            )}
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{blog.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              By {blog.authorName}
              {blog.publishedAt && ` · ${new Date(blog.publishedAt).toLocaleDateString()}`} · {blog.readingTimeMinutes} min read
            </p>
            <p className="mt-4 text-slate-600 italic">{blog.excerpt}</p>
            <div className="mt-6 space-y-4 whitespace-pre-wrap text-slate-800">{blog.content}</div>

            <div className="mt-8 flex gap-2 border-t border-slate-200 pt-6">
              <span className="text-sm text-slate-500">Share:</span>
              <ShareButton
                buildUrl={(pageUrl) => `https://wa.me/?text=${encodeURIComponent(`${blog.title} ${pageUrl}`)}`}
                label="WhatsApp"
              />
              <ShareButton
                buildUrl={(pageUrl) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(pageUrl)}`}
                label="Twitter/X"
              />
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

// The page URL is only real once mounted in the browser, so it's read at click time
// (an event handler) rather than baked into a pre-rendered href — no effect/state needed.
function ShareButton({ buildUrl, label }: { buildUrl: (pageUrl: string) => string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.open(buildUrl(window.location.href), "_blank", "noopener,noreferrer")}
      className="text-sm font-medium text-orange-600 hover:text-orange-700"
    >
      {label}
    </button>
  );
}

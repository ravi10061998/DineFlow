/**
 * Brand logo — an inline SVG icon badge + wordmark, not a raster image.
 * Renders crisply at any size, zero network dependency. The icon badge
 * reuses the same amber→orange→rose gradient as the homepage hero and
 * admin dashboard banner, so the mark and the rest of the brand feel
 * like one system rather than a logo bolted on separately.
 */

const GRADIENT_ID = "dineflow-logo-gradient";

interface LogoProps {
  /** "light": white wordmark, for use on the gradient/dark hero. "dark": slate wordmark, for white/light backgrounds. */
  variant?: "light" | "dark";
  /** Icon-only badge, no wordmark — for tight spaces like a favicon-sized slot. */
  iconOnly?: boolean;
  className?: string;
}

export function Logo({ variant = "dark", iconOnly = false, className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="55%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${GRADIENT_ID})`} />
        {/* Crossed fork & spoon, centered in the badge */}
        <g stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M12 8v4.2c0 1-.8 1.8-1.8 1.8h0A1.8 1.8 0 0 1 8.4 12.2V8" />
          <path d="M10.2 8v16" />
          <path d="M21.6 8c-1.6 1.8-2.6 4-2.6 6.4 0 1.6.9 2.6 2 2.6h.6v7" />
        </g>
      </svg>
      {!iconOnly && (
        <span className={`text-lg font-bold tracking-tight ${variant === "light" ? "text-white" : "text-slate-900"}`}>
          DineFlow
        </span>
      )}
    </span>
  );
}

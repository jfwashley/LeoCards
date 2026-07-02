// Phase 17 (D-03) — the ONE reusable Daybreak-toned shimmer placeholder.
// No true shimmer/skeleton analog exists elsewhere in the repo (confirmed
// via repo-wide search — zero Skeleton/shimmer hits, zero loading.tsx
// files). API shape is based on pill.tsx's props/className merge
// convention + bw-medallion.tsx's size-prop/palette-const convention.
//
// RSC-safe: no hooks, no client directive — this is only ever a static
// placeholder. Space is always reserved via width/height so CLS stays 0
// wherever it's dropped in (e.g. `next/dynamic`'s `loading` option).
// The pulse animation is CSS-only (@keyframes shimmer-pulse in
// globals.css) and is disabled under prefers-reduced-motion, following the
// exact hab-fall convention (Phase 24 habitat confetti).

const SHIMMER_BASE = "#F0E3CF"; // cream base — matches bw-medallion/ac-progress family
const SHIMMER_SWEEP = "#FFE7BC"; // subtly darker amber sweep

interface DaybreakShimmerProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
}

export function DaybreakShimmer({
  width = "100%",
  height = 16,
  radius = 8,
  className,
}: DaybreakShimmerProps) {
  return (
    <div
      className={["db-shimmer", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        flex: "none",
        background: `linear-gradient(90deg, ${SHIMMER_BASE} 25%, ${SHIMMER_SWEEP} 50%, ${SHIMMER_BASE} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer-pulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

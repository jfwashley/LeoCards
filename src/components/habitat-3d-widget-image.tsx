"use client";

import Image from "next/image";
import type { HabitatState } from "@/lib/habitat-engine";

/**
 * Phase 13 Plan 06 — D-28 = CACHED.
 *
 * Static <Image>-based replacement for the live 3D dashboard widget.
 * One hero image per level (1..9) is rendered build-time by
 * `e2e/scripts/render-hero-images.spec.ts` into `public/habitat/widget-l{N}.webp`.
 *
 * Notes:
 *   - 80px display, 160px source (DPR 2 friendly).
 *   - `preload` (Next.js 16 replacement for `priority`) ensures the widget
 *     image is fetched eagerly so dashboard LCP is unaffected.
 *   - Mood reactivity intentionally NOT bound here: hero images are level-only.
 *     The full /habitat page still owns mood/decay (Plan 04).
 */
export default function HabitatWidgetImage({
  habitatState,
}: {
  habitatState: HabitatState;
}) {
  const level = Math.max(1, Math.min(9, habitatState.level));
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ height: 80 }}
    >
      <Image
        src={`/habitat/widget-l${level}.webp`}
        alt={`Lion habitat level ${level}`}
        width={80}
        height={80}
        preload
        data-testid="habitat-widget-image"
      />
    </div>
  );
}

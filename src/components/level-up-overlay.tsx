"use client";

import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

// ============================================================
// Constants
// ============================================================

// Daybreak confetti palette (D-05: amber, green, red, gold, ink)
const CONFETTI_COLORS = ["#F28A1F", "#3E9B5F", "#DE5F4A", "#F2B33A", "#4A331C"];
const CONFETTI_COUNT = 36;

// Pre-compute rotate directions to avoid Math.random() during render
// (stable across renders since indexes are deterministic)
const CONFETTI_ROTATE_DIRS = Array.from({ length: CONFETTI_COUNT }, (_, i) =>
  i % 2 === 0 ? 1 : -1,
);

// ============================================================
// Props
// ============================================================

interface LevelUpOverlayProps {
  level: number;
  onDismiss: () => void;
}

// ============================================================
// Component
// ============================================================

export function LevelUpOverlay({ level, onDismiss }: LevelUpOverlayProps) {
  const reduced = usePrefersReducedMotion();
  const assetLevel = Math.min(level, 9); // L9 cap — widget-l10.webp does not exist (Pitfall 4)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(255, 246, 233, 0.92)" }}
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Confetti — only when motion is allowed (D-06) */}
      {!reduced && (
        <div
          data-testid="confetti-layer"
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: confetti items are positional visual decorations, never reordered
              key={index}
              data-confetti-particle
              className="absolute top-0 w-2 h-3 rounded-sm pointer-events-none"
              style={{
                left: `${5 + (index / CONFETTI_COUNT) * 90}vw`,
                backgroundColor: CONFETTI_COLORS[index % 5],
              }}
              initial={{ y: "-10vh", opacity: 1, rotate: 0 }}
              animate={{
                y: "110vh",
                opacity: 0,
                rotate: 360 * (CONFETTI_ROTATE_DIRS[index] ?? 1),
              }}
              transition={{
                duration: 2.5,
                delay: (index % 8) * 0.07,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}

      {/* Content — always shows (static Leo + stats even in reduced-motion) */}
      <div className="relative flex flex-col items-center gap-4 text-center px-6">
        {/* Soft-Clay Leo (D-05) — static widget-l{N}.webp, L9-clamped */}
        {/* biome-ignore lint/performance/noImgElement: dynamic src with Math.min clamp is unsupported by next/image; plain <img> required for the L9-clamped habitat asset path (20-RESEARCH.md OQ-1, Pitfall 4) */}
        <img
          src={`/habitat/widget-l${assetLevel}.webp`}
          alt="Leo"
          width={160}
          height={160}
          style={{ borderRadius: 16, objectFit: "cover" }}
        />
        <p className="text-sm text-muted-foreground">Habitat Level</p>
        <p className="font-display text-[62px] font-bold text-primary leading-none">
          {level}
        </p>
        <p className="text-base text-foreground">
          {/* NOTE: level === 10 condition intentionally preserved per CONTEXT Deferred —
              dead branch (habitat caps at L9); do NOT change to level >= 9 (scope fence) */}
          {level === 10
            ? "A bird arrived in your habitat!"
            : "Your habitat grew!"}
        </p>
        <p className="text-sm text-muted-foreground mt-6">
          Tap anywhere to continue
        </p>
      </div>
    </motion.div>
  );
}

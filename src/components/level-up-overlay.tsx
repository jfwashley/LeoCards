"use client";

import { motion } from "motion/react";

// ============================================================
// Constants
// ============================================================

const CONFETTI_COLORS = ["#F97316", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
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
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: confetti items are positional visual decorations, never reordered
            key={index}
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

      {/* Content */}
      <div className="relative flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">Habitat Level</p>
        <p className="text-[28px] font-semibold text-primary">{level}</p>
        <p className="text-base text-foreground">
          {level === 10
            ? "A bird arrived in your habitat!"
            : "Your habitat grew!"}
        </p>
        <p className="text-sm text-muted-foreground mt-8">
          Tap anywhere to continue
        </p>
      </div>
    </motion.div>
  );
}

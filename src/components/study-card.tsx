"use client";

import { motion, useMotionValue, useTransform } from "motion/react";

import type { SessionCard } from "@/lib/study-engine";

interface StudyCardProps {
  card: SessionCard;
  flipped: boolean;
  swipeReady: boolean;
  onFlip: () => void;
  onGrade: (direction: "left" | "right") => void;
  exitDirection: "left" | "right" | null;
}

export function StudyCard({
  card,
  flipped,
  swipeReady,
  onFlip,
  onGrade,
  exitDirection,
}: StudyCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const bgColorRight = useTransform(
    x,
    [0, 40, 200],
    ["rgba(0,0,0,0)", "rgba(220,252,231,0.6)", "rgba(220,252,231,0.8)"],
  );
  const bgColorLeft = useTransform(
    x,
    [-200, -40, 0],
    ["rgba(254,226,226,0.8)", "rgba(254,226,226,0.6)", "rgba(0,0,0,0)"],
  );

  // Determine which text is on which face based on stage
  const frontText = card.stage === "n2t" ? card.front : card.back;
  const backText = card.stage === "n2t" ? card.back : card.front;
  const frontPrompt =
    card.stage === "n2t" ? "What's the translation?" : "What does this mean?";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!flipped) {
        onFlip();
      }
    } else if (e.key === "ArrowRight" && swipeReady) {
      e.preventDefault();
      onGrade("right");
    } else if (e.key === "ArrowLeft" && swipeReady) {
      e.preventDefault();
      onGrade("left");
    }
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { velocity: { x: number }; offset: { x: number } },
  ) {
    if (!swipeReady) return;
    const { velocity, offset } = info;
    if (Math.abs(velocity.x) > 500 || Math.abs(offset.x) > 80) {
      onGrade(offset.x > 0 || velocity.x > 0 ? "right" : "left");
    }
  }

  return (
    <motion.div
      drag={swipeReady ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: exitDirection === "right" ? 400 : -400,
        opacity: 0,
        transition: { duration: 0.25, ease: "easeIn" },
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative w-full"
    >
      {/* Swipe color feedback overlays */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none z-10"
        style={{ backgroundColor: bgColorRight }}
      />
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none z-10"
        style={{ backgroundColor: bgColorLeft }}
      />

      {/* Card container with 3D perspective */}
      {/* biome-ignore lint/a11y/useSemanticElements: div required for preserve-3d CSS; <button> does not reliably support transformStyle:preserve-3d across browsers */}
      <div
        className="relative w-full"
        style={{ transformStyle: "preserve-3d", minHeight: 200 }}
        role="button"
        tabIndex={0}
        aria-label={
          flipped
            ? `Answer: ${backText}`
            : `Question: ${frontText}. Press Enter to reveal.`
        }
        onKeyDown={handleKeyDown}
        onClick={!flipped ? onFlip : undefined}
      >
        {/* Front face */}
        <motion.div
          className="absolute inset-0 bg-card border border-border rounded-xl flex flex-col items-center justify-center gap-2 px-8 py-6 cursor-pointer select-none"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-xl sm:text-2xl md:text-[28px] font-semibold text-foreground text-center">
            {frontText}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            {frontPrompt}
          </p>
          {!flipped && (
            <p className="text-xs text-muted-foreground mt-2">Tap to reveal</p>
          )}
        </motion.div>

        {/* Back face */}
        <motion.div
          className="absolute inset-0 bg-card border border-border rounded-xl flex flex-col items-center justify-center gap-2 px-8 py-6 select-none"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            rotateY: -180,
          }}
          animate={{ rotateY: flipped ? 0 : -180 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-xl sm:text-2xl md:text-[28px] font-semibold text-foreground text-center">
            {backText}
          </p>
          {swipeReady && (
            <p className="text-xs text-muted-foreground mt-2">
              Swipe right ✓ &nbsp; left if still learning
            </p>
          )}
        </motion.div>

        {/* Invisible spacer to give the relative container height */}
        <div className="invisible px-8 py-6" style={{ minHeight: 200 }}>
          <p className="text-xl sm:text-2xl md:text-[28px] font-semibold">
            {frontText}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

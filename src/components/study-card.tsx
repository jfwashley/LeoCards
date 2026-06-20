"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import type { QaCardData } from "@/components/qa-state-badge";
import { QaStateBadge } from "@/components/qa-state-badge";
import type { SessionCard } from "@/lib/study-engine";

interface StudyCardProps {
  card: SessionCard;
  flipped: boolean;
  swipeReady: boolean;
  onFlip: () => void;
  onGrade: (direction: "left" | "right") => void;
  exitDirection: "left" | "right" | null;
  qaMode?: boolean;
}

export function StudyCard({
  card,
  flipped,
  swipeReady,
  onFlip,
  onGrade,
  exitDirection,
  qaMode = false,
}: StudyCardProps) {
  // Build QA badge data only when QA-authed (RSC sets qaMode=true via readQaAuth()).
  // qaCardData is null for customers — badge component never renders (QAOB-04 / T-14-07).
  // SessionCard has no pausedAt (paused cards are filtered before session); use null.
  const qaCardData: QaCardData | null = qaMode
    ? {
        masteryRound: card.masteryRound,
        stage: card.stage,
        cooldownUntil: card.cooldownUntil,
        pausedAt: null,
      }
    : null;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const bgColorRight = useTransform(
    x,
    [0, 40, 200],
    ["rgba(0,0,0,0)", "rgba(62,155,95,0.6)", "rgba(62,155,95,0.8)"],
  );
  const bgColorLeft = useTransform(
    x,
    [-200, -40, 0],
    ["rgba(222,95,74,0.8)", "rgba(222,95,74,0.6)", "rgba(0,0,0,0)"],
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
      {/* Swipe color feedback overlays — Daybreak green/red palette (D-02) */}
      <motion.div
        className="absolute inset-0 rounded-[22px] pointer-events-none z-10"
        style={{ backgroundColor: bgColorRight }}
      />
      <motion.div
        className="absolute inset-0 rounded-[22px] pointer-events-none z-10"
        style={{ backgroundColor: bgColorLeft }}
      />

      {/* QA state badge — only mounts when QA-authed; absent from customer DOM (T-14-07) */}
      {qaCardData && <QaStateBadge data={qaCardData} />}

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
        {/* Front face — Daybreak card surface (D-02) */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 py-6 cursor-pointer select-none"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 22,
            background: "#FFFFFF",
            border: "1px solid #F0E3CF",
            boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
          }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-[12.5px] font-bold tracking-[2.2px] text-muted-foreground text-center uppercase">
            {frontPrompt}
          </p>
          <p className="font-display text-[42px] font-bold text-foreground text-center leading-[1.15]">
            {frontText}
          </p>
          {!flipped && (
            <span
              className="absolute bottom-[22px] text-[13px] font-semibold rounded-full px-4 py-2"
              style={{ color: "#B4762A", background: "#FFF1DC" }}
            >
              Tap to reveal
            </span>
          )}
        </motion.div>

        {/* Back face — Daybreak card surface (D-02) */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 py-6 select-none"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            rotateY: -180,
            borderRadius: 22,
            background: "#FFFFFF",
            border: "1px solid #F0E3CF",
            boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
          }}
          animate={{ rotateY: flipped ? 0 : -180 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="font-display text-[42px] font-bold text-foreground text-center leading-[1.15]">
            {backText}
          </p>
          {swipeReady && (
            <p
              className="text-[13px] font-semibold text-center"
              style={{ color: "#9C8467" }}
              data-testid="card-back-hint"
            >
              <span style={{ color: "#DE5F4A" }}>←</span>
              {" "}still learning · got it{" "}
              <span style={{ color: "#3E9B5F" }}>→</span>
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

"use client";

import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CardStack } from "@/components/card-stack";
import { LionFace } from "@/components/daybreak/lion-face";
import { TBtn } from "@/components/daybreak/t-btn";
import { LevelUpOverlay } from "@/components/level-up-overlay";
import { StudyCard } from "@/components/study-card";
import type { GradeEntry, SessionCard, SessionStats } from "@/lib/study-engine";

// ============================================================
// State types
// ============================================================

type StudyingState = {
  phase: "studying";
  queue: SessionCard[];
  currentIndex: number;
  graded: GradeEntry[];
  flipped: boolean;
  swipeReady: boolean;
  lastGradeDirection: "left" | "right" | null;
  showQuitConfirm: boolean;
  hasFlippedFirst: boolean;
  hasSwiped: boolean;
};

type SessionPhase =
  | StudyingState
  | { phase: "committing"; graded: GradeEntry[] }
  | { phase: "end"; stats: SessionStats }
  | { phase: "error"; message: string; graded: GradeEntry[] };

// ============================================================
// Actions
// ============================================================

type Action =
  | { type: "FLIP_CARD" }
  | { type: "ENABLE_SWIPE" }
  | { type: "SWIPE_GRADE"; direction: "left" | "right" }
  | { type: "TOGGLE_QUIT_CONFIRM" }
  | { type: "QUIT_SESSION" }
  | { type: "COMMIT_DONE"; stats: SessionStats }
  | { type: "COMMIT_ERROR"; message: string }
  | { type: "RETRY_COMMIT" };

// ============================================================
// Reducer
// ============================================================

function reducer(state: SessionPhase, action: Action): SessionPhase {
  switch (action.type) {
    case "FLIP_CARD": {
      if (state.phase !== "studying" || state.flipped) return state;
      return {
        ...state,
        flipped: true,
        hasFlippedFirst: true,
      };
    }

    case "ENABLE_SWIPE": {
      if (state.phase !== "studying") return state;
      return { ...state, swipeReady: true };
    }

    case "SWIPE_GRADE": {
      if (state.phase !== "studying" || !state.swipeReady) return state;

      const current = state.queue[state.currentIndex];
      if (!current) return state;

      const correct = action.direction === "right";
      const newGrade: GradeEntry = {
        cardId: current.id,
        direction: current.stage,
        correct,
      };
      const newGraded = [...state.graded, newGrade];
      const nextIndex = state.currentIndex + 1;

      if (nextIndex >= state.queue.length) {
        const lastGradeByCard = new Map<string, boolean>();
        for (const g of newGraded) {
          lastGradeByCard.set(String(g.cardId), g.correct);
        }

        const stillLearningCards = state.queue.filter((c) => {
          const lastCorrect = lastGradeByCard.get(String(c.id));
          return lastCorrect === false;
        });

        if (stillLearningCards.length > 0) {
          return {
            phase: "studying",
            queue: stillLearningCards,
            currentIndex: 0,
            graded: newGraded,
            flipped: false,
            swipeReady: false,
            lastGradeDirection: action.direction,
            showQuitConfirm: false,
            hasFlippedFirst: false,
            hasSwiped: true,
          };
        }

        return { phase: "committing", graded: newGraded };
      }

      return {
        ...state,
        currentIndex: nextIndex,
        graded: newGraded,
        flipped: false,
        swipeReady: false,
        lastGradeDirection: action.direction,
        hasSwiped: true,
      };
    }

    case "TOGGLE_QUIT_CONFIRM": {
      if (state.phase !== "studying") return state;
      return { ...state, showQuitConfirm: !state.showQuitConfirm };
    }

    case "QUIT_SESSION": {
      if (state.phase !== "studying") return state;
      return { phase: "committing", graded: state.graded };
    }

    case "COMMIT_DONE": {
      return { phase: "end", stats: action.stats };
    }

    case "COMMIT_ERROR": {
      return {
        phase: "error",
        message: action.message,
        graded: state.phase === "committing" ? state.graded : [],
      };
    }

    case "RETRY_COMMIT": {
      if (state.phase !== "error") return state;
      return { phase: "committing", graded: state.graded };
    }

    default:
      return state;
  }
}

// ============================================================
// Stats computation
// ============================================================

function computeStats(
  initialCards: SessionCard[],
  graded: GradeEntry[],
): SessionStats {
  const cardsStudied = new Set(graded.map((g) => String(g.cardId))).size;
  const correctCount = graded.filter((g) => g.correct).length;

  const round2CardIds = new Set(
    initialCards.filter((c) => c.masteryRound === 2).map((c) => String(c.id)),
  );
  const newlyLearned = graded.filter(
    (g) => g.correct && round2CardIds.has(String(g.cardId)),
  ).length;

  return { cardsStudied, correctCount, newlyLearned, leveledUp: null };
}

// ============================================================
// Props
// ============================================================

interface StudySessionProps {
  initialCards: SessionCard[];
  deckId: string;
  qaMode?: boolean;
}

// ============================================================
// Component
// ============================================================

export function StudySession({
  initialCards,
  deckId,
  qaMode = false,
}: StudySessionProps) {
  const router = useRouter();

  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);

  const [state, dispatch] = useReducer(reducer, {
    phase: "studying",
    queue: initialCards,
    currentIndex: 0,
    graded: [],
    flipped: false,
    swipeReady: false,
    lastGradeDirection: null,
    showQuitConfirm: false,
    hasFlippedFirst: false,
    hasSwiped: false,
  } satisfies StudyingState);

  const handleLevelUpDismiss = useCallback(() => {
    const leveledUp = showLevelUp;
    setShowLevelUp(null);
    if (leveledUp !== null) {
      router.push(`/habitat?celebrate=${leveledUp}`);
    }
  }, [showLevelUp, router]);

  // 300ms swipe enable after flip
  const isFlipped = state.phase === "studying" ? state.flipped : false;
  const isSwipeReady = state.phase === "studying" ? state.swipeReady : false;

  useEffect(() => {
    if (state.phase === "studying" && isFlipped && !isSwipeReady) {
      const timer = setTimeout(() => {
        dispatch({ type: "ENABLE_SWIPE" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase, isFlipped, isSwipeReady]);

  // Stable per-session idempotency key. A retried commit (RETRY_COMMIT) re-POSTs
  // the SAME commitId, so the server treats the replay as a no-op instead of
  // double-applying grades (see /api/study/complete, WR-04). Initialized lazily
  // once per mount — survives the studying→committing→error→committing cycle.
  const commitIdRef = useRef<string>("");
  if (!commitIdRef.current) {
    commitIdRef.current = crypto.randomUUID();
  }

  // Commit grades when entering "committing" phase
  // Uses ref to capture graded data, avoiding dependency on entire state object
  const gradedRef = useRef<GradeEntry[]>([]);
  if (state.phase === "committing") {
    gradedRef.current = state.graded;
  }

  useEffect(() => {
    if (state.phase !== "committing") return;

    const graded = gradedRef.current;

    async function commit() {
      try {
        const response = await fetch("/api/study/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId,
            commitId: commitIdRef.current,
            grades: graded.map((g) => ({
              cardId: String(g.cardId),
              direction: g.direction,
              correct: g.correct,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const stats = computeStats(initialCards, graded);
        dispatch({
          type: "COMMIT_DONE",
          stats: { ...stats, leveledUp: data.leveledUp ?? null },
        });
        if (data.leveledUp !== null && data.leveledUp !== undefined) {
          setShowLevelUp(data.leveledUp);
        }
      } catch {
        dispatch({
          type: "COMMIT_ERROR",
          message:
            "Couldn't save your progress. Check your connection and try again.",
        });
      }
    }

    commit();
  }, [state.phase, initialCards, deckId]);

  // ⬇ Safe edit zone — render only. Lines above are PRESERVE (reducer/commit/idempotency).

  // ============================================================
  // Render: committing
  // ============================================================

  if (state.phase === "committing") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <LionFace size={48} />
        <p className="text-sm text-muted-foreground">Saving your progress…</p>
      </div>
    );
  }

  // ============================================================
  // Render: error
  // ============================================================

  if (state.phase === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4 sm:px-8">
        <LionFace size={56} />
        <p className="text-base text-center text-foreground">{state.message}</p>
        <TBtn
          style={{ maxWidth: 280 }}
          onClick={() => dispatch({ type: "RETRY_COMMIT" })}
        >
          Retry saving session
        </TBtn>
      </div>
    );
  }

  // ============================================================
  // Render: end screen
  // ============================================================

  if (state.phase === "end") {
    const { cardsStudied, correctCount, newlyLearned } = state.stats;
    const correctPct =
      cardsStudied > 0 ? Math.round((correctCount / cardsStudied) * 100) : 0;

    return (
      <>
        <AnimatePresence>
          {showLevelUp !== null && (
            <LevelUpOverlay
              level={showLevelUp}
              onDismiss={handleLevelUpDismiss}
            />
          )}
        </AnimatePresence>
        <div className="min-h-screen bg-background flex items-center justify-center">
          {/* Phase 17 (D-05) — CSS-only mount fade (was motion.div opacity/y
              tween); ss-fade-up keyframe + reduced-motion override live in
              globals.css, following the hab-fall convention. */}
          <div className="ss-fade-up flex flex-col items-center gap-6 sm:gap-8 px-4 sm:px-8 text-center">
            {/* LionFace replaces 🐯 emoji (D-04) */}
            <LionFace size={80} />
            <h1 className="font-display text-[20px] font-bold text-foreground">
              Great work, keep it up!
            </h1>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-[32px] font-bold text-foreground">
                  {cardsStudied}
                </span>
                <span className="text-sm text-muted-foreground">studied</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-[32px] font-bold text-foreground">
                  {correctPct}%
                </span>
                <span className="text-sm text-muted-foreground">correct</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                {/* "learned" numeral stays amber (text-primary) — D-04 */}
                <span className="font-display text-[32px] font-bold text-primary">
                  {newlyLearned}
                </span>
                <span className="text-sm text-muted-foreground">learned</span>
              </div>
            </div>
            {/* TBtn replaces shadcn Button (Pitfall 7) */}
            <TBtn
              style={{ maxWidth: 280 }}
              onClick={() => router.push(`/dashboard?deck=${deckId}`)}
            >
              Back to deck
            </TBtn>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // Render: studying
  // ============================================================

  const {
    queue,
    currentIndex,
    flipped,
    swipeReady,
    lastGradeDirection,
    showQuitConfirm,
    hasFlippedFirst,
    hasSwiped,
  } = state;
  const current = queue[currentIndex];
  const remainingCount = queue.length - currentIndex - 1;

  const showSwipeHint = hasFlippedFirst && !hasSwiped && currentIndex === 0;

  if (!current) return null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-perf-ready="true"
    >
      {/* Top bar — Daybreak chrome */}
      <div
        className="flex items-center justify-between flex-none"
        style={{ padding: "4px 22px 0" }}
      >
        <button
          type="button"
          aria-label="Quit study session"
          onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1.5px solid #EDDFC9",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4A331C",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
        <span
          className="text-[14px] font-semibold text-muted-foreground"
          style={{ letterSpacing: 0.3 }}
        >
          Study session
        </span>
        <span style={{ width: 40 }} aria-hidden="true" />
      </div>

      {/* Quit-confirm popover — Daybreak card surface */}
      {showQuitConfirm && (
        <div
          className="mx-4 sm:mx-6"
          style={{
            borderRadius: 18,
            background: "#FFFFFF",
            border: "1px solid #F0E3CF",
            boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <p className="text-sm text-foreground">
            Quit session? Your progress so far will be saved.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="h-9 px-4 text-sm font-semibold rounded-[10px] border text-foreground"
              style={{ borderColor: "#EDDFC9", background: "#FFFFFF" }}
              onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
            >
              Keep studying
            </button>
            <TBtn
              style={{
                width: "auto",
                height: 36,
                padding: "0 16px",
                fontSize: 14,
                borderRadius: 10,
              }}
              onClick={() => dispatch({ type: "QUIT_SESSION" })}
            >
              Save and quit
            </TBtn>
          </div>
        </div>
      )}

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 sm:px-8">
        <div
          className="relative w-full max-w-sm mx-auto"
          style={{ perspective: 1000 }}
        >
          <CardStack remainingCount={remainingCount} />
          <AnimatePresence mode="popLayout">
            <StudyCard
              key={`${String(current.id)}-${currentIndex}`}
              card={current}
              flipped={flipped}
              swipeReady={swipeReady}
              onFlip={() => dispatch({ type: "FLIP_CARD" })}
              onGrade={(dir) =>
                dispatch({ type: "SWIPE_GRADE", direction: dir })
              }
              exitDirection={lastGradeDirection}
              qaMode={qaMode}
            />
          </AnimatePresence>
        </div>

        {/* Hint pill — Daybreak style (D-02 HiFiStudy spec) */}
        {showSwipeHint && (
          <div
            className="text-[13.5px] font-semibold"
            style={{
              color: "#9C8467",
              background: "#FFFFFF",
              border: "1.5px solid #F0E3CF",
              padding: "9px 18px",
              borderRadius: 999,
            }}
          >
            Swipe <span style={{ color: "#3E9B5F" }}>→</span> if you got it ·{" "}
            <span style={{ color: "#DE5F4A" }}>←</span> still learning
          </div>
        )}
      </div>
    </div>
  );
}

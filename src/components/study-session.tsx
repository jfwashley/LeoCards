"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CardStack } from "@/components/card-stack";
import { LevelUpOverlay } from "@/components/level-up-overlay";
import { StudyCard } from "@/components/study-card";
import { Button } from "@/components/ui/button";
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
    if (leveledUp === 10) {
      router.push(`/dashboard?deck=${deckId}&celebrate=10`);
    }
  }, [showLevelUp, router, deckId]);

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

  // ============================================================
  // Render: committing
  // ============================================================

  if (state.phase === "committing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Saving your progress...</p>
      </div>
    );
  }

  // ============================================================
  // Render: error
  // ============================================================

  if (state.phase === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 sm:px-8">
        <p className="text-base text-center text-foreground">{state.message}</p>
        <Button
          variant="default"
          onClick={() => dispatch({ type: "RETRY_COMMIT" })}
        >
          Retry saving session
        </Button>
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
          <motion.div
            className="flex flex-col items-center gap-6 sm:gap-8 px-4 sm:px-8 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <span className="text-6xl" role="img" aria-label="Tiger">
              🐯
            </span>
            <h1 className="text-lg sm:text-[20px] font-semibold text-foreground">
              Great work, keep it up!
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl sm:text-[28px] font-semibold text-foreground">
                  {cardsStudied}
                </span>
                <span className="text-sm text-muted-foreground">studied</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl sm:text-[28px] font-semibold text-foreground">
                  {correctPct}%
                </span>
                <span className="text-sm text-muted-foreground">correct</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl sm:text-[28px] font-semibold text-primary">
                  {newlyLearned}
                </span>
                <span className="text-sm text-muted-foreground">learned</span>
              </div>
            </div>
            <Button
              variant="default"
              onClick={() => router.push(`/dashboard?deck=${deckId}`)}
            >
              Back to deck
            </Button>
          </motion.div>
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar — responsive padding */}
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4">
        <span className="text-sm text-muted-foreground">Study session</span>
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="ghost"
            className="h-10 px-3 text-sm"
            aria-label="Quit study session"
            onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
          >
            Quit session
          </Button>

          {showQuitConfirm && (
            <div className="flex flex-col items-end gap-2 p-3 rounded-lg border border-border bg-card shadow-sm">
              <p className="text-sm text-foreground">
                Quit session? Your progress so far will be saved.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 px-3 text-sm"
                  onClick={() => dispatch({ type: "TOGGLE_QUIT_CONFIRM" })}
                >
                  Keep studying
                </Button>
                <Button
                  variant="default"
                  className="h-10 px-3 text-sm"
                  onClick={() => dispatch({ type: "QUIT_SESSION" })}
                >
                  Save and quit
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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

        {showSwipeHint && (
          <p className="text-sm text-muted-foreground text-center">
            Swipe right if correct, left if still learning
          </p>
        )}
      </div>
    </div>
  );
}

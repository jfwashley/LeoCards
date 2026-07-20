"use client";

import { Pause, Pencil, Play, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { CardRow } from "@/components/card-edit-dialog";
import { LionFace } from "@/components/daybreak/lion-face";
import { DaybreakShimmer } from "@/components/daybreak/shimmer";
import { QaStateBadge } from "@/components/qa-state-badge";

// Phase 17 (D-03) — CardEditDialog is only needed on edit-click, not initial
// paint. Lazy-loaded via next/dynamic behind the one reusable DaybreakShimmer
// placeholder (sized to loosely approximate the dialog's card body; the
// Dialog's own overlay/centering chrome mounts once the real chunk resolves).
// Rendered only when `editCard !== null` (see below) so the dynamic import
// never fires on initial page load — only on the first edit-click.
const CardEditDialog = dynamic(
  () =>
    import("@/components/card-edit-dialog").then((mod) => mod.CardEditDialog),
  { loading: () => <DaybreakShimmer width={340} height={320} radius={22} /> },
);

interface CardListProps {
  cards: CardRow[];
  /** Active deck id — threaded into the empty-state CTA links so multi-deck
   *  users add/browse words in THIS deck, not the decks[0] fallback (WR-01). */
  deckId: string;
  nativeLangLabel: string;
  targetLangLabel: string;
  qaMode?: boolean;
}

// SourceTag: maps source + paused state to Daybreak tag styling (DSH-05, L-06)
function SourceTag({ src, paused }: { src: string; paused: boolean }) {
  const label = paused
    ? "Paused"
    : src === "manual"
      ? "Added by you"
      : "Curated";
  const bg = paused ? "#F1E9DD" : src === "manual" ? "#EAF3EC" : "#FFF1DC";
  const color = paused ? "#8C7A63" : src === "manual" ? "#3E8B5C" : "#B4762A";
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11.5,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {label}
    </span>
  );
}

// MasteryMeter: 3-bar design — amber fill, green + check at 3/3; paused rows pass step=0 (DSH-05)
function MasteryMeter({ step, paused }: { step: number; paused: boolean }) {
  const effectiveStep = paused ? 0 : step;
  const done = effectiveStep >= 3;
  const fill = done ? "#3E9B5F" : "#F28A1F";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 16,
            borderRadius: 4,
            background: i < effectiveStep ? fill : "#F0E3CF",
            display: "inline-block",
          }}
        />
      ))}
      {done && (
        <span
          style={{
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: "#3E9B5F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}

// IconBtn: 36x36 rounded-10, border 1.5px #EDDFC9 (DSH-05 mock lines 101-103)
function IconBtn({
  onClick,
  disabled,
  "aria-label": ariaLabel,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1.5px solid #EDDFC9",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export const CardList = React.memo(function CardList({
  cards,
  deckId,
  nativeLangLabel: _nativeLangLabel,
  targetLangLabel: _targetLangLabel,
  qaMode = false,
}: CardListProps) {
  const [query, setQuery] = useState("");
  const [editCard, setEditCard] = useState<CardRow | null>(null);
  const [open, setOpen] = useState(false);
  // Phase 17 (D-05) — CSS-only accordion (was AnimatePresence + motion.div).
  // `open` is the semantic state (drives aria-expanded on the header button).
  // `panelMounted` tracks whether the panel exists in the DOM at all — it
  // unmounts only once the close animation finishes, matching
  // AnimatePresence's exit-then-unmount behavior exactly (so closed-state
  // content stays out of the DOM/tab-order/a11y tree, not just visually
  // hidden — see the "search input is NOT in the document when collapsed"
  // test this preserves).
  //
  // Mounting is driven by a CSS @keyframes `animation` (cl-accordion-open-kf
  // in globals.css), NOT a `transition` — an `animation` plays its full
  // keyframe sequence as soon as the class is applied, even on the element's
  // very first paint, unlike `transition` which needs two SEPARATE paints to
  // interpolate between (an earlier version of this component used
  // `transition` + a requestAnimationFrame-delayed class flip to fake a
  // from-state; that multi-render-tick window was long enough for
  // router.refresh()'s CardList remount (see togglePause below) to land
  // mid-sequence and reset panelMounted back to false, which broke
  // e2e/12-pause-cards.spec.ts — pausing a card never showed the re-opened
  // accordion's rows. Driving the animation via @keyframes lets `open` and
  // `panelMounted` be set SYNCHRONOUSLY in the same click-handler call,
  // closing that race entirely).
  const [panelMounted, setPanelMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [, startTransition] = useTransition();

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  // Unmount-on-close safety net: covers prefers-reduced-motion (a `none`
  // animation never fires animationend) and any environment with no real
  // CSS animation timing (e.g. jsdom in unit tests) — slightly longer than
  // the 0.22s CSS animation in globals.css. The panel's own onAnimationEnd
  // (below) is the primary, faster signal in a real browser. Inlined
  // (rather than referencing the clearCloseTimer function declared above)
  // so the effect only touches the stable closeTimerRef — closures over a
  // plain function re-created every render would otherwise need it listed
  // as an exhaustive-deps dependency, which would defeat the "only run on
  // unmount" intent of the empty dependency array.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  function handleAccordionToggle() {
    // WR-02: compute the next value from the in-scope `open` and keep ALL
    // side effects (timer scheduling, setPanelMounted) OUTSIDE the setOpen
    // updater — React requires updaters to be pure (they may be replayed
    // during render / double-invoked in StrictMode).
    const next = !open;
    clearCloseTimer();
    if (next) {
      setPanelMounted(true);
    } else {
      closeTimerRef.current = setTimeout(() => {
        setPanelMounted(false);
        closeTimerRef.current = null;
      }, 260);
    }
    setOpen(next);
  }

  const togglePause = (card: CardRow) => {
    setPendingCardIds((prev) => new Set(prev).add(card.id));
    startTransition(async () => {
      const action = card.pausedAt ? "unpause" : "pause";
      try {
        const res = await fetch(`/api/cards/${card.id}/${action}`, {
          method: "POST",
        });
        if (res.ok) {
          router.refresh(); // Pitfall 2 — revalidatePath alone would not update the open tab
        } else {
          console.error(
            `Pause toggle failed (${res.status}); state will resync on next refresh`,
          );
        }
      } catch (err) {
        console.error("Pause toggle network error", err);
      } finally {
        setPendingCardIds((prev) => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }
    });
  };

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return cards;
    const lower = trimmed.toLowerCase();
    return cards.filter(
      (c) =>
        c.front.toLowerCase().includes(lower) ||
        c.back.toLowerCase().includes(lower),
    );
  }, [query, cards]);

  // Learned count: cards with masteryRound >= 3 (D-03 accordion header)
  const learnedCount = cards.filter((c) => (c.masteryRound ?? 0) >= 3).length;

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        {/* Leo medallion — 110px #FFF1DC circle (ObEmptyDeck) */}
        <div
          className="flex items-center justify-center rounded-full flex-none"
          style={{ width: 110, height: 110, background: "#FFF1DC" }}
        >
          <LionFace
            size={66}
            mane="#E8973B"
            face="#FFD9A6"
            muzzle="#FFF1DC"
            ink="#4A331C"
          />
        </div>
        <h2 className="font-display text-[22px] font-bold text-foreground">
          Your deck is empty
        </h2>
        <p className="text-[14.5px] text-muted-foreground leading-[1.5] max-w-[240px] text-center">
          Add a few words and Leo&rsquo;s habitat starts to grow.
        </p>
        {/* 80%-width action column */}
        <div className="flex flex-col gap-[11px] w-[80%]">
          {/* Primary: Browse words */}
          <Link
            href={`/deck/browse?deck=${deckId}`}
            data-testid="browse-words-empty"
            className="flex items-center justify-center w-full rounded-[14px] bg-primary text-primary-foreground font-display text-[16px] font-bold shadow-[var(--db-btn-shadow)] hover:brightness-[0.97] transition-[filter]"
            style={{ height: 50 }}
          >
            Browse words
          </Link>
          {/* Ghost: + Add a card */}
          <Link
            href={`/deck/new-card?deck=${deckId}`}
            className="flex items-center justify-center w-full rounded-[14px] font-display text-[16px] font-bold text-foreground hover:brightness-[0.97] transition-[filter]"
            style={{
              height: 50,
              background: "var(--background)",
              border: "1.5px solid #EDDFC9",
            }}
          >
            + Add a card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* "Your words" accordion header (D-03, DSH-04) */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="words-panel"
        data-testid="words-accordion-header"
        onClick={handleAccordionToggle}
        style={{
          background: "#FFFFFF",
          border: "1px solid #F0E3CF",
          borderRadius: 16,
          padding: "15px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "#4A331C",
          }}
        >
          Your words
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#8C7A63" }}>
            {learnedCount} learned
          </span>
          {/* Chevron: up when open, down when closed */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: "#8C7A63",
            }}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Panel — search + word rows (Phase 17 D-05: CSS @keyframes animation,
          was AnimatePresence + motion.div height/opacity tween). Conditionally
          mounted on panelMounted — matches the original's exit-then-unmount
          behavior exactly (see handleAccordionToggle above); cl-accordion-open
          / cl-accordion-closing + the paired prefers-reduced-motion override
          live in globals.css. */}
      {panelMounted && (
        <section
          id="words-panel"
          aria-label="Your words"
          className={open ? "cl-accordion-open" : "cl-accordion-closing"}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget || open) return;
            clearCloseTimer();
            setPanelMounted(false);
          }}
        >
          <div className="cl-accordion-inner flex flex-col gap-4 pt-2">
            {/* Search bar — lives INSIDE the accordion panel (Pitfall 6) */}
            <div
              className="relative"
              style={{
                height: 42,
                borderRadius: 12,
                background: "var(--db-field-bg, #FAF6F0)",
                border: "1.5px solid #EDDFC9",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                data-testid="words-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your words"
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  paddingLeft: 36,
                  paddingRight: query ? 36 : 12,
                  fontSize: 14,
                  color: "#4A331C",
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* No results — Daybreak ObNoSearch (inside the panel per DSH-07) */}
            {filtered.length === 0 && query && (
              <div className="flex flex-col items-center justify-center py-12 gap-[13px] text-center">
                {/* Leo medallion — 96px #F3E3C6 circle (ObNoSearch) */}
                <div
                  className="flex items-center justify-center rounded-full flex-none"
                  style={{ width: 96, height: 96, background: "#F3E3C6" }}
                >
                  <LionFace
                    size={56}
                    mane="#E8973B"
                    face="#FFD9A6"
                    muzzle="#FFF1DC"
                    ink="#4A331C"
                  />
                </div>
                <h2 className="font-display text-[20px] font-bold text-foreground">
                  No words match &ldquo;{query}&rdquo;
                </h2>
                <p className="text-[14px] text-muted-foreground leading-[1.45] max-w-[230px]">
                  Try a different spelling, or clear the search.
                </p>
                {/* Ghost: Clear search */}
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex items-center justify-center rounded-[14px] font-display text-[15px] font-bold text-foreground hover:brightness-[0.97] transition-[filter] px-[18px]"
                  style={{
                    height: 44,
                    background: "var(--background)",
                    border: "1.5px solid #EDDFC9",
                  }}
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Word rows — Daybreak CardRow (DSH-05) */}
            {filtered.length > 0 && (
              <div className="flex flex-col">
                {filtered.map((card) => {
                  // Derive stage from masteryRound for QA badge (no per-session stage).
                  const browseStage: "n2t" | "t2n" =
                    (card.masteryRound ?? 0) === 1 ? "t2n" : "n2t";
                  const paused = !!card.pausedAt;

                  return (
                    <div
                      key={card.id}
                      data-testid="card-row"
                      data-card-id={card.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 2px",
                        borderBottom: "1px solid #F4ECDD",
                        opacity: paused ? 0.55 : 1,
                        position: "relative",
                      }}
                    >
                      {/* QA badge — preserved from pre-restyle position (DSH-07) */}
                      {qaMode && (
                        <QaStateBadge
                          data={{
                            masteryRound: card.masteryRound ?? 0,
                            stage: browseStage,
                            cooldownUntil: card.cooldownUntil ?? null,
                            pausedAt: card.pausedAt,
                          }}
                        />
                      )}

                      {/* Word text — D-04: native FIRST (bold) / target SECOND (muted) */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* D-04: native-on-top override of the handoff CardRow — intentional, do not "correct" */}
                        <div
                          style={{
                            fontSize: 16.5,
                            fontWeight: 700,
                            color: "#4A331C",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {card.front}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13.5,
                              color: "#8C7A63",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {card.back}
                          </span>
                          <SourceTag src={card.source} paused={paused} />
                        </div>
                      </div>

                      {/* Mastery meter — 3 bars, paused rows pass step 0 */}
                      <MasteryMeter
                        step={card.masteryRound ?? 0}
                        paused={paused}
                      />

                      {/* Pause/Resume icon button */}
                      <IconBtn
                        aria-label={
                          paused ? "Resume this card" : "Pause this card"
                        }
                        disabled={pendingCardIds.has(card.id)}
                        onClick={() => togglePause(card)}
                      >
                        {paused ? (
                          <Play
                            className="size-4"
                            style={{ color: "#8C7A63" }}
                          />
                        ) : (
                          <Pause
                            className="size-4"
                            style={{ color: "#8C7A63" }}
                          />
                        )}
                      </IconBtn>

                      {/* Edit icon button */}
                      <IconBtn
                        aria-label="Edit card"
                        onClick={() => setEditCard(card)}
                      >
                        <Pencil
                          className="size-4"
                          style={{ color: "#8C7A63" }}
                        />
                      </IconBtn>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {editCard !== null && (
        <CardEditDialog
          card={editCard}
          open={editCard !== null}
          onOpenChange={(o) => {
            if (!o) setEditCard(null);
          }}
        />
      )}
    </div>
  );
});

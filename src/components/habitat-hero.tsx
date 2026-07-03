import Link from "next/link";
import { HabitatMedallion } from "@/components/habitat-medallion";
import type { HabitatState } from "@/lib/habitat-engine";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HabitatHeroProps {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
  sleeping?: boolean; // true during cooldown; owned by deck-view.tsx (Plan 04)
}

// ---------------------------------------------------------------------------
// Chevron glyph (right-pointing, inline SVG)
// ---------------------------------------------------------------------------

function ChevronRight() {
  return (
    <svg
      aria-hidden="true"
      width="8"
      height="13"
      viewBox="0 0 8 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 1.5L6.5 6.5L1.5 11.5"
        stroke="#C96F12"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// HabitatHero
// ---------------------------------------------------------------------------

export function HabitatHero({
  habitatState,
  celebratingLevel = null,
  sleeping = false,
}: HabitatHeroProps) {
  const { level, learnedCardCount, nextLevelThreshold } = habitatState;

  // D-05: canonical max check
  const isMaxLevel = nextLevelThreshold === null;

  // Subtitle text (D-05/D-06):
  // - isMaxLevel → "Course 1 complete" (no next-level line)
  // - sleeping   → napping/recharging cue (timer stays in status row — D-06)
  // - else       → "N of M cards to Level N+1"
  let subtitleContent: React.ReactNode;
  if (isMaxLevel) {
    subtitleContent = "Course 1 complete";
  } else if (sleeping) {
    subtitleContent = "Your lion is napping · cards recharging";
  } else {
    subtitleContent = (
      <>
        <span style={{ color: "#4A331C", fontWeight: 700 }}>
          {learnedCardCount} of {nextLevelThreshold}
        </span>{" "}
        cards to Level {level + 1}
      </>
    );
  }

  const href = celebratingLevel
    ? `/habitat?celebrate=${celebratingLevel}`
    : "/habitat";

  return (
    <Link href={href} className="block">
      <div
        style={{
          background: "linear-gradient(180deg, #FFF3DC 0%, #FFFFFF 70%)",
          border: "1px solid #F0E3CF",
          borderRadius: 22,
          boxShadow: "0 10px 26px rgba(160,110,40,0.12)",
          padding: "26px 22px 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          textAlign: "center",
          flex: "none",
        }}
      >
        {/* Medallion — always passes REAL state; never forces a zeroed ring (D-06) */}
        <HabitatMedallion
          size={132}
          level={level}
          learnedCardCount={learnedCardCount}
          nextLevelThreshold={nextLevelThreshold}
          sleeping={sleeping}
        />

        {/* Title */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            color: "#4A331C",
            lineHeight: 1,
          }}
        >
          Habitat &middot; Level {level}
        </div>

        {/* Subtitle (D-05/D-06) */}
        <div
          data-testid="habitat-hero-subtitle"
          style={{ fontSize: 14.5, color: "#8C7A63", lineHeight: 1.35 }}
        >
          {subtitleContent}
        </div>

        {/* "View habitat" affordance — visual cue only (whole card is already a link) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 13.5,
            fontWeight: 700,
            color: "#C96F12",
            marginTop: 1,
          }}
        >
          View habitat <ChevronRight />
        </div>
      </div>
    </Link>
  );
}

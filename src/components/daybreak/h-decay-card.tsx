// HDecayCard — "Leo misses you" decay card with "Study now" → /dashboard.
// Daybreak atom (D-10, D-14).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx HabDecay lines 113-125.
// "Study now" routes to /dashboard (Pattern 4b: HabitatState has no deckId).
// No "use client" — next/link is RSC-safe.

import Link from "next/link";

export function HDecayCard() {
  return (
    <div
      data-testid="habitat-decay-card"
      style={{
        position: "relative",
        zIndex: 3,
        margin: "0 16px 18px",
        padding: "16px 17px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.94)",
        boxShadow: "0 10px 28px rgba(120,80,30,0.18)",
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {/* Sad-Leo disc — simple grey circle placeholder (no mood-specific glyph needed) */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#EEF1F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          {/* CSS sad-dot glyph: centre dot — no emoji (L-01) */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#7C93B0",
            }}
          />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 700,
              color: "#4A331C",
            }}
          >
            Leo misses you
          </div>
          <div style={{ fontSize: 13.5, color: "#9C8467" }}>
            A quick session brings the world back to life.
          </div>
        </div>
      </div>
      <Link
        href="/dashboard"
        style={{
          height: 48,
          borderRadius: 14,
          background: "#F28A1F",
          color: "#FFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 17,
          boxShadow: "0 8px 18px rgba(242,138,31,0.3)",
          textDecoration: "none",
        }}
      >
        Study now
      </Link>
    </div>
  );
}

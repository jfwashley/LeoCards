// HLevelBadge — round LVL pill; gold at L9 via level >= 9 (D-12).
// Daybreak atom for the Habitat chrome (D-13).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx lines 30-37.
// Gold colour: #F2B33A at level >= 9 (not === 9), amber #F28A1F otherwise.
// No "use client" — pure props-to-markup, RSC-safe.

export function HLevelBadge({ level }: { level: number }) {
  const isMax = level >= 9;
  return (
    <div
      data-testid="habitat-level-badge"
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        background: isMax ? "#F2B33A" : "#F28A1F",
        border: "3px solid rgba(255,255,255,0.9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFF",
        lineHeight: 1,
        boxShadow: "0 4px 12px rgba(242,138,31,0.32)",
        flex: "none",
      }}
    >
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 0.5,
          opacity: 0.9,
        }}
      >
        LVL
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 19,
          fontWeight: 700,
          marginTop: -1,
        }}
      >
        {level}
      </span>
    </div>
  );
}

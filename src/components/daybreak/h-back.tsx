// HBack — circular frosted back button → Dashboard.
// Daybreak atom for the Habitat chrome (D-13).
// Handoff: design/handoff-daybreak/daybreak-habitat.jsx lines 16-19.
// No "use client" — pure props-to-markup, RSC-safe.

import Link from "next/link";

export function HBack() {
  return (
    <Link
      href="/dashboard"
      data-testid="habitat-back-btn"
      aria-label="Back to Dashboard"
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 3px 10px rgba(120,80,30,0.16)",
        flex: "none",
        textDecoration: "none",
      }}
    >
      {/* Left-pointing chevron: CSS border trick (no emoji, no SVG) */}
      <span
        style={{
          width: 9,
          height: 9,
          borderLeft: "2.4px solid #4A331C",
          borderBottom: "2.4px solid #4A331C",
          transform: "rotate(45deg)",
          marginLeft: 3,
          display: "inline-block",
        }}
      />
    </Link>
  );
}

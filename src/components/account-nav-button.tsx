// AccountNavButton — dashboard header glyph -> /account (D-01).
// RSC-safe (no "use client") — a bare next/link, no onClick handler, pure
// navigation. Same "filled flat geometric shape from divs" technique as
// LogoutGlyph (a div-built glyph, not an SVG element), per
// 25-UI-SPEC.md's Header glyph swap section and 25-PATTERNS.md's
// account-nav-button.tsx pattern assignment.
//
// Small-Target Wrapper: the 36x36 visual frame (EXACT match to the
// pre-Phase-25 LogoutButton frame numbers) sits inside a 44x44 transparent
// hit area — 36px alone is under the project's 44px e2e-enforced
// touch-target floor.

import Link from "next/link";

// AccountGlyph — person-silhouette (head-and-shoulders) line glyph.
// ink color #4A331C (Daybreak "ink" token). Canvas 16x16; head is a
// 6.5x6.5 circle centered at the top; shoulders are a 14x7.5 shape
// (border-radius 8px 8px 0 0) centered at the bottom. Ink-line on white —
// never amber-filled (UI-SPEC's Color section).
function AccountGlyph() {
  const c = "#4A331C";
  return (
    <div
      style={{ position: "relative", width: 16, height: 16 }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 6.5,
          height: 6.5,
          borderRadius: "50%",
          background: c,
          transform: "translateX(-50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: 14,
          height: 7.5,
          borderRadius: "8px 8px 0 0",
          background: c,
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}

export function AccountNavButton() {
  return (
    <Link
      href="/account"
      data-testid="account-nav-btn"
      aria-label="My Account"
      style={{
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        flex: "none",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1.5px solid #EDDFC9",
          background: "#FFFFFF",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          flex: "none",
        }}
      >
        <AccountGlyph />
      </span>
    </Link>
  );
}

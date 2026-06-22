// ACTop — Daybreak Add-a-Card top bar.
// "‹ My deck" escape link (left) + "Add a Card" display title (right).
// data-testid="add-card-title" on the title span so e2e/04 + e2e/09 can locate it.

import Link from "next/link";

export function ACTop() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#C96F12",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          flex: "none",
        }}
      >
        &#8249; My deck
      </Link>
      <span
        data-testid="add-card-title"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 700,
          color: "#4A331C",
        }}
      >
        Add a Card
      </span>
      {/* Right spacer — mirrors the left link width so the title stays visually centred */}
      <span style={{ flex: "none", width: 60 }} />
    </div>
  );
}

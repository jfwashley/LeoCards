import type * as React from "react";

// ACBanner — Daybreak ok/error status banner.
// Uses CSS circle glyphs (✓ / !) — no emoji (L-01).

interface ACBannerProps {
  kind: "ok" | "error";
  children: React.ReactNode;
}

export function ACBanner({ kind, children }: ACBannerProps) {
  const ok = kind === "ok";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 12,
        flex: "none",
        background: ok ? "#EAF5EC" : "#FCEBE6",
        border: `1.5px solid ${ok ? "#C5E4CD" : "#F2C9BF"}`,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flex: "none",
          background: ok ? "#3E9B5F" : "#DE5F4A",
          color: "#FFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {ok ? "✓" : "!"}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A331C" }}>
        {children}
      </span>
    </div>
  );
}

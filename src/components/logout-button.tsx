"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

// LogoutGlyph — Daybreak SVG glyph per daybreak-dashboard.jsx lines 18-26
// ink color #4A331C (Daybreak "ink" token)
function LogoutGlyph() {
  const c = "#4A331C";
  return (
    <div style={{ position: "relative", width: 18, height: 15 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 2.1,
          background: c,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 5,
          top: 6.5,
          width: 12,
          height: 2.1,
          background: c,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 3,
          width: 7.5,
          height: 7.5,
          borderTop: `2.1px solid ${c}`,
          borderRight: `2.1px solid ${c}`,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={handleSignOut}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1.5px solid #EDDFC9",
        background: "#FFFFFF",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxSizing: "border-box",
        flex: "none",
      }}
    >
      <LogoutGlyph />
    </button>
  );
}

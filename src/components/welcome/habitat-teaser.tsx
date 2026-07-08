"use client";

import { LionFace } from "@/components/daybreak/lion-face";

// Static sunrise scene elements — same CSS geometry as DaybreakAuthScene
// (auth-card.tsx), sized for the 210px teaser container. DOM/CSS only — no Three.js,
// canvas, or video pipeline. SSR-safe: all geometry is static; motion is additive.
function TeaserScene() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: "linear-gradient(180deg, #FFE7BC 0%, #FFF3DC 100%)",
      }}
    >
      {/* Sun disc */}
      <div
        style={{
          position: "absolute",
          right: 30,
          top: 18,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "#FFC95C",
          boxShadow: "0 0 0 10px rgba(255, 201, 92, 0.22)",
        }}
      />
      {/* Hill 1 (left) */}
      <div
        style={{
          position: "absolute",
          left: "-20%",
          bottom: -60,
          width: "130%",
          height: 130,
          borderRadius: "50%",
          background: "#F7D592",
        }}
      />
      {/* Hill 2 (right) */}
      <div
        style={{
          position: "absolute",
          right: "-16%",
          bottom: -50,
          width: "120%",
          height: 110,
          borderRadius: "50%",
          background: "#EFB964",
        }}
      />
      {/* Grass tufts */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "12%",
          width: 14,
          height: 9,
          borderRadius: 3,
          background: "rgba(116, 78, 24, 0.22)",
          transform: "rotate(-12deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "24%",
          width: 10,
          height: 9,
          borderRadius: 3,
          background: "rgba(116, 78, 24, 0.22)",
          transform: "rotate(-12deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 28,
          right: "16%",
          width: 13,
          height: 9,
          borderRadius: 3,
          background: "rgba(116, 78, 24, 0.22)",
          transform: "rotate(-12deg)",
        }}
      />
      {/* Leo — centered, bottom-anchored */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 34,
        }}
      >
        <LionFace
          size={88}
          mane="#E8973B"
          face="#FFD9A6"
          muzzle="#FFF1DC"
          ink="#4A331C"
        />
      </div>
    </div>
  );
}

export function HabitatTeaser() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 210 }}
      aria-label="Leo's growing habitat preview"
    >
      {/* Static scene — always renders (SSR-safe, no animation dependency) */}
      <TeaserScene />

      {/* Ambient glow — CSS keyframe (Phase 17 D-05, was motion/react).
          habitat-teaser-glow-pulse + a `display: none` reduced-motion
          override live in globals.css. Unlike the previous
          usePrefersReducedMotion-gated mount, this is CSS-only from first
          paint — no SSR-default-false flash window (the hook always
          defaults to `reduced=false` during SSR/initial render, so the old
          conditional mount could briefly animate for reduced-motion users
          before the effect corrected it; a media query has no such gap). */}
      <div
        className="habitat-teaser-glow absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(255, 201, 92, 0.35) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

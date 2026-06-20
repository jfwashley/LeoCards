// Daybreak auth "habitat-flashcard" card: a small sunrise habitat scene on top,
// form content below, with two ghost-peek card edges behind it. Ported from the
// design handoff (hifi-shared.jsx → GhostPeek/HiFiLogin, hifi-daybreak.jsx → D1Scene).
// The scene recolours per auth screen (login/signup = sunrise, forgot = daylight,
// reset = dusk).

import type { ReactNode } from "react";
import { LionFace } from "./lion-face";

type SceneVariant = "sunrise" | "daylight" | "dusk";

const SCENES: Record<
  SceneVariant,
  { grad: string; sun: string; glow: string; hill1: string; hill2: string }
> = {
  sunrise: {
    grad: "linear-gradient(180deg, #FFE7BC 0%, #FFF3DC 100%)",
    sun: "#FFC95C",
    glow: "rgba(255, 201, 92, 0.25)",
    hill1: "#F7D592",
    hill2: "#EFB964",
  },
  daylight: {
    grad: "linear-gradient(180deg, #DDEFFF 0%, #F1F8FF 100%)",
    sun: "#FFE08A",
    glow: "rgba(255, 224, 138, 0.30)",
    hill1: "#CFE0A4",
    hill2: "#ADCB79",
  },
  dusk: {
    grad: "linear-gradient(180deg, #FFD9B0 0%, #F6D6C2 100%)",
    sun: "#FF9E6B",
    glow: "rgba(255, 158, 107, 0.25)",
    hill1: "#E7B98C",
    hill2: "#CE9A6E",
  },
};

function GhostPeek({
  top,
  widthPct,
  opacity,
}: {
  top: number;
  widthPct: string;
  opacity: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top,
        transform: "translateX(-50%)",
        width: widthPct,
        height: 22,
        background: "#FFFFFF",
        opacity,
        borderRadius: "22px 22px 0 0",
        border: "1px solid #F0E3CF",
        borderBottom: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

export function DaybreakAuthScene({
  variant = "sunrise",
  tagline = "Your lion is waiting.",
  height = 216,
}: {
  variant?: SceneVariant;
  tagline?: string;
  height?: number;
}) {
  const v = SCENES[variant];
  const grass = (left: string, w: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        bottom: 30,
        left,
        width: w,
        height: 10,
        borderRadius: 3,
        background: "rgba(116, 78, 24, 0.25)",
        transform: "rotate(-12deg)",
      }}
    />
  );
  return (
    <div
      style={{
        position: "relative",
        height,
        overflow: "hidden",
        background: v.grad,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          right: 30,
          top: 20,
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: v.sun,
          boxShadow: `0 0 0 14px ${v.glow}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-18%",
          bottom: -78,
          width: "135%",
          height: 170,
          borderRadius: "50%",
          background: v.hill1,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-14%",
          bottom: -66,
          width: "125%",
          height: 140,
          borderRadius: "50%",
          background: v.hill2,
        }}
      />
      {grass("11%", 16, "g1")}
      {grass("22%", 11, "g2")}
      {grass("74%", 15, "g3")}
      {grass("85%", 10, "g4")}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 36,
        }}
      >
        <LionFace size={88} />
      </div>
      {tagline ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 11,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "#8A6235",
            fontFamily: "var(--font-sans)",
          }}
        >
          {tagline}
        </div>
      ) : null}
    </div>
  );
}

export function AuthCard({
  scene,
  children,
}: {
  scene: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "relative", paddingTop: 20, width: "100%" }}>
      <GhostPeek top={0} widthPct="62%" opacity={0.45} />
      <GhostPeek top={10} widthPct="76%" opacity={0.8} />
      <div
        style={{
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid #F0E3CF",
          boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
          boxSizing: "border-box",
        }}
      >
        {scene}
        <div
          style={{
            padding: "20px 22px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 15,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

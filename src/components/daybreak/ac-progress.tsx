import { LionFace } from "@/components/daybreak/lion-face";

// ACProgress — Daybreak calm long-wait atom.
// Renders LionFace in a sunrise disc + an animated indeterminate amber bar
// + title and sub text. searching=true adds a magnifier overlay.
// No emoji — CSS/SVG glyphs only (L-01). No Cancel button inside this atom
// (the consumer renders Cancel beside it).

interface ACProgressProps {
  title: string;
  sub: string;
  searching?: boolean;
}

// Magnifier glyph: CSS circle + handle (no emoji, L-01)
function MagnifierGlyph() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: 10,
        bottom: 12,
        width: 30,
        height: 30,
        borderRadius: "50%",
        border: "3px solid #F28A1F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFF",
      }}
    >
      <span
        style={{
          width: 9,
          height: 2.5,
          background: "#F28A1F",
          borderRadius: 2,
          transform: "rotate(45deg)",
          position: "absolute",
          right: -4,
          bottom: 2,
        }}
      />
    </div>
  );
}

export function ACProgress({ title, sub, searching }: ACProgressProps) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 28,
        textAlign: "center",
      }}
    >
      {/* Sunrise disc */}
      <div
        style={{
          width: 116,
          height: 116,
          borderRadius: "50%",
          background: "linear-gradient(180deg, #FFE7BC, #FFFDF8)",
          border: "1px solid #F0E3CF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Amber dot top-right (always present) */}
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 14,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#FFC95C",
          }}
        />
        <LionFace
          size={62}
          mane="#E8973B"
          face="#FFD9A6"
          muzzle="#FFF1DC"
          ink="#4A331C"
        />
        {searching && <MagnifierGlyph />}
      </div>

      {/* Title */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 23,
          fontWeight: 700,
          color: "#4A331C",
        }}
      >
        {title}
      </span>

      {/* Indeterminate amber bar — CSS keyframe (Phase 17 D-05, was
          motion/react); ac-progress-slide + reduced-motion override live in
          globals.css, following the hab-fall convention. */}
      <div
        style={{
          width: "74%",
          height: 12,
          borderRadius: 7,
          background: "#F1E6D2",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className="ac-progress-bar"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "42%",
            borderRadius: 7,
            background: "#F28A1F",
          }}
        />
      </div>

      {/* Sub text */}
      <span
        style={{
          fontSize: 14.5,
          color: "#9C8467",
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        {sub}
      </span>
    </div>
  );
}

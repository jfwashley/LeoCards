// ACSeg — Daybreak segmented mode toggle (Type a word | From an image).
// Each segment is a real <button type="button"> so getByRole("button", { name })
// resolves in Playwright and @testing-library (Pitfall 1 — L-06).

type SegMode = "type" | "image";

interface ACSegProps {
  mode: SegMode;
  onChange: (m: SegMode) => void;
}

// Inline CSS glyphs — no emoji (L-01).
function PencilGlyph({ c }: { c: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: 14,
        height: 14,
        display: "inline-block",
        flex: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 3,
          width: 10,
          height: 10,
          border: `2px solid ${c}`,
          borderRadius: 2,
          background: "transparent",
          transform: "rotate(-45deg)",
          boxSizing: "border-box",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 4,
          height: 4,
          background: c,
          borderRadius: 1,
          transform: "rotate(-45deg)",
        }}
      />
    </span>
  );
}

function MiniImgGlyph({ c }: { c: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 16,
        height: 14,
        borderRadius: 3,
        border: `2px solid ${c}`,
        position: "relative",
        display: "inline-block",
        boxSizing: "border-box",
        flex: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 2,
          bottom: 1.5,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: c,
        }}
      />
      <span
        style={{
          position: "absolute",
          right: -1,
          bottom: 1,
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: `6px solid ${c}`,
        }}
      />
    </span>
  );
}

const SEGMENTS: { mode: SegMode; label: string }[] = [
  { mode: "type", label: "Type a word" },
  { mode: "image", label: "From an image" },
];

export function ACSeg({ mode, onChange }: ACSegProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 5,
        padding: 5,
        background: "#F4E7D2",
        borderRadius: 14,
        flex: "none",
      }}
    >
      {SEGMENTS.map((seg) => {
        const active = mode === seg.mode;
        const iconColor = active ? "#F28A1F" : "#9C8467";
        return (
          <button
            key={seg.mode}
            type="button"
            onClick={() => onChange(seg.mode)}
            aria-pressed={active}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 11,
              background: active ? "#FFFFFF" : "transparent",
              boxShadow: active ? "0 2px 8px rgba(160,110,40,0.14)" : "none",
              color: active ? "#4A331C" : "#9C8467",
              fontWeight: 700,
              fontSize: 14.5,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            {seg.mode === "type" ? (
              <PencilGlyph c={iconColor} />
            ) : (
              <MiniImgGlyph c={iconColor} />
            )}
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

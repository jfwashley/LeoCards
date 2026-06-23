// Daybreak topic medallion + 14 CSS-drawn geometric amber icons.
// Ported 1:1 from design/handoff-daybreak/daybreak-browse.jsx TOPIC_ICON map.
// Pure (no hooks) — RSC-safe. CSS placeholder per PROJECT.md; swappable later,
// keeping the Daybreak palette. Pattern: identical to LionFace — position:relative
// container, absolutely-positioned divs/spans for each glyph element.

const STK = 2.2;
const ICON_COLOR = "#F28A1F"; // bt.primary

function r(s: React.CSSProperties): React.CSSProperties {
  return {
    position: "absolute",
    border: `${STK}px solid ${ICON_COLOR}`,
    boxSizing: "border-box",
    ...s,
  };
}

function l(s: React.CSSProperties): React.CSSProperties {
  return {
    position: "absolute",
    background: ICON_COLOR,
    borderRadius: 2,
    ...s,
  };
}

// Each entry renders the full glyph inside a 27×26 px relative container (TG in the mock).
const ICON_MAP: Record<string, React.ReactNode> = {
  Greetings: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({ left: 0, top: 0, width: 27, height: 19, borderRadius: 8 })}
      />
      <div
        style={{
          position: "absolute",
          left: 6,
          bottom: 0,
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: `8px solid ${ICON_COLOR}`,
        }}
      />
    </div>
  ),
  Numbers: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 17,
          color: ICON_COLOR,
          letterSpacing: -1,
        }}
      >
        123
      </span>
    </div>
  ),
  Colors: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({
          left: 0,
          top: 1,
          width: 15,
          height: 15,
          borderRadius: "50%",
        })}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 1,
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: ICON_COLOR,
          opacity: 0.32,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 6,
          bottom: 0,
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: ICON_COLOR,
          opacity: 0.6,
        }}
      />
    </div>
  ),
  "Days & Months": (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({ left: 1, top: 3, width: 25, height: 22, borderRadius: 5 })}
      />
      <div style={l({ left: 1, top: 9, width: 25, height: STK })} />
      <div style={l({ left: 6, top: 0, width: STK, height: 6 })} />
      <div style={l({ right: 6, top: 0, width: STK, height: 6 })} />
      <div
        style={{
          position: "absolute",
          left: 5,
          top: 13,
          width: 4,
          height: 4,
          borderRadius: 1,
          background: ICON_COLOR,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 13,
          width: 4,
          height: 4,
          borderRadius: 1,
          background: ICON_COLOR,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 19,
          top: 13,
          width: 4,
          height: 4,
          borderRadius: 1,
          background: ICON_COLOR,
        }}
      />
    </div>
  ),
  "Food & Drink": (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({
          left: 3,
          top: 5,
          width: 17,
          height: 18,
          borderRadius: "3px 3px 8px 8px",
          borderTop: "none",
        })}
      />
      <div
        style={r({
          right: 0,
          top: 7,
          width: 8,
          height: 9,
          borderRadius: "0 8px 8px 0",
          borderLeft: "none",
        })}
      />
      <div style={l({ left: 8, top: 0, width: STK, height: 4 })} />
      <div style={l({ left: 13, top: 0, width: STK, height: 4 })} />
    </div>
  ),
  Family: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({
          left: 0,
          top: 1,
          width: 10,
          height: 10,
          borderRadius: "50%",
        })}
      />
      <div
        style={r({
          left: 0,
          top: 13,
          width: 10,
          height: 12,
          borderRadius: "6px 6px 0 0",
        })}
      />
      <div
        style={r({
          right: 0,
          top: 3,
          width: 9,
          height: 9,
          borderRadius: "50%",
        })}
      />
      <div
        style={r({
          right: 0,
          top: 14,
          width: 9,
          height: 11,
          borderRadius: "5px 5px 0 0",
        })}
      />
    </div>
  ),
  Body: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({
          left: 8,
          top: 0,
          width: 11,
          height: 11,
          borderRadius: "50%",
        })}
      />
      <div
        style={r({
          left: 5,
          top: 13,
          width: 17,
          height: 13,
          borderRadius: "8px 8px 0 0",
        })}
      />
    </div>
  ),
  Animals: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 6,
          bottom: 0,
          width: 15,
          height: 13,
          borderRadius: "50%",
          background: ICON_COLOR,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1,
          top: 4,
          width: 6,
          height: 8,
          borderRadius: "50%",
          background: ICON_COLOR,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 9,
          top: 0,
          width: 6,
          height: 8,
          borderRadius: "50%",
          background: ICON_COLOR,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 1,
          top: 4,
          width: 6,
          height: 8,
          borderRadius: "50%",
          background: ICON_COLOR,
        }}
      />
    </div>
  ),
  Clothing: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 2,
          width: 27,
          height: 23,
          background: ICON_COLOR,
          clipPath:
            "polygon(0% 28%, 30% 0%, 38% 9%, 62% 9%, 70% 0%, 100% 28%, 80% 44%, 78% 38%, 78% 100%, 22% 100%, 22% 38%, 20% 44%)",
        }}
      />
    </div>
  ),
  Home: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 1,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: "13px solid transparent",
          borderRight: "13px solid transparent",
          borderBottom: `11px solid ${ICON_COLOR}`,
        }}
      />
      <div
        style={r({
          left: 4,
          top: 10,
          width: 19,
          height: 15,
          borderRadius: "0 0 3px 3px",
          borderTop: "none",
        })}
      />
    </div>
  ),
  Weather: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={{
          position: "absolute",
          right: 1,
          top: 0,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: ICON_COLOR,
          opacity: 0.5,
        }}
      />
      <div
        style={r({
          left: 0,
          bottom: 2,
          width: 22,
          height: 13,
          borderRadius: 9,
        })}
      />
      <div
        style={r({
          left: 5,
          bottom: 7,
          width: 12,
          height: 12,
          borderRadius: "50%",
        })}
      />
    </div>
  ),
  Shopping: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({
          left: 3,
          top: 6,
          width: 21,
          height: 19,
          borderRadius: "0 0 4px 4px",
        })}
      />
      <div
        style={r({
          left: 8,
          top: 0,
          width: 11,
          height: 12,
          borderRadius: "50%",
          borderBottom: "none",
        })}
      />
    </div>
  ),
  Travel: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 5,
          top: 0,
          width: 17,
          height: 17,
          background: ICON_COLOR,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 11,
          top: 6,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#FFFFFF",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 7,
          bottom: 0,
          width: 13,
          height: 4,
          borderRadius: "50%",
          background: ICON_COLOR,
          opacity: 0.3,
        }}
      />
    </div>
  ),
  Work: (
    <div style={{ position: "relative", width: 27, height: 26, flex: "none" }}>
      <div
        style={r({ left: 0, top: 6, width: 27, height: 19, borderRadius: 4 })}
      />
      <div
        style={r({
          left: 8,
          top: 1,
          width: 11,
          height: 7,
          borderRadius: "4px 4px 0 0",
          borderBottom: "none",
        })}
      />
      <div style={l({ left: 0, top: 13, width: 27, height: STK })} />
    </div>
  ),
};

function TopicIcon({ name }: { name: string }) {
  return ICON_MAP[name] ?? null;
}

export function BWMedallion({
  name,
  size = 52,
}: {
  name: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        background: "#FFF1DC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
      aria-hidden="true"
    >
      <TopicIcon name={name} />
    </div>
  );
}

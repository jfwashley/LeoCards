// ACPairRow — Daybreak translation pair atom.
// CRITICAL (D-01): TARGET (ES) field is rendered FIRST (top), NATIVE (EN) is
// rendered SECOND (bottom). This orientation is deliberate and must NOT be
// flipped. A unit test in ac-atoms.test.tsx locks this order.

interface ACPairRowProps {
  targetLabel: string; // e.g. "ES"
  nativeLabel: string; // e.g. "EN"
  target: string;
  native: string;
  failed?: boolean; // red EN border + "Translation unavailable — enter manually."
  last?: boolean;
  onEditTarget: (v: string) => void;
  onEditNative: (v: string) => void;
}

export function ACPairRow({
  targetLabel,
  nativeLabel,
  target,
  native,
  failed,
  last,
  onEditTarget,
  onEditNative,
}: ACPairRowProps) {
  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: last ? "none" : "1px solid #F4ECDD",
        display: "flex",
        flexDirection: "column",
        gap: 9,
      }}
    >
      {/* TOP: TARGET (ES) field — D-01 orientation */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#9C8467",
            width: 24,
            flex: "none",
          }}
        >
          {targetLabel}
        </span>
        <input
          value={target}
          onChange={(e) => onEditTarget(e.target.value)}
          style={{
            flex: 1,
            minHeight: 46,
            borderRadius: 11,
            padding: "0 13px",
            background: "#FFFBF4",
            border: "1.5px solid #EDDFC9",
            fontSize: 16.5,
            fontWeight: 700,
            color: "#4A331C",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* BOTTOM: NATIVE (EN) field — D-01 orientation */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#9C8467",
            width: 24,
            flex: "none",
          }}
        >
          {nativeLabel}
        </span>
        <input
          value={native}
          onChange={(e) => onEditNative(e.target.value)}
          style={{
            flex: 1,
            minHeight: 46,
            borderRadius: 11,
            padding: "0 13px",
            background: "#FFFBF4",
            border: failed ? "1.5px solid #DE5F4A" : "1.5px solid #EDDFC9",
            fontSize: 16.5,
            color: failed ? "#DE5F4A" : "#4A331C",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Translation unavailable helper (failed state only) */}
      {failed && (
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#DE5F4A",
            marginLeft: 35,
          }}
        >
          Translation unavailable — enter manually.
        </span>
      )}
    </div>
  );
}

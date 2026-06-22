// ACReviewRow — Daybreak keep/exclude word row atom.
// Checkbox, word (line-through when excluded), edit + remove buttons.
// All interactive controls are real <button type="button"> elements (L-06).
// CSS/SVG glyphs only — no emoji (L-01).

interface ACReviewRowProps {
  word: string;
  excluded: boolean;
  last?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

// Pencil glyph (CSS only, no emoji)
function PencilGlyph() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: 14,
        height: 14,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 9,
          height: 9,
          border: "2px solid #4A331C",
          borderRadius: 2,
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
          background: "#4A331C",
          borderRadius: 1,
          transform: "rotate(-45deg)",
        }}
      />
    </span>
  );
}

// Close/X glyph (CSS only, no emoji)
function CloseGlyph() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: 18,
        height: 18,
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "46%",
          left: 0,
          width: 18,
          height: 2.2,
          background: "#9C8467",
          borderRadius: 2,
          transform: "rotate(45deg)",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: "46%",
          left: 0,
          width: 18,
          height: 2.2,
          background: "#9C8467",
          borderRadius: 2,
          transform: "rotate(-45deg)",
        }}
      />
    </span>
  );
}

export function ACReviewRow({
  word,
  excluded,
  last,
  onToggle,
  onEdit,
  onRemove,
}: ACReviewRowProps) {
  const checked = !excluded;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 2px",
        borderBottom: last ? "none" : "1px solid #F4ECDD",
      }}
    >
      {/* Checkbox as a real button (so toggling is reachable and testable) */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        aria-label={checked ? "Exclude word" : "Include word"}
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flex: "none",
          boxSizing: "border-box",
          border: checked ? "none" : "2px solid #D8C7AC",
          background: checked ? "#F28A1F" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFF",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
        }}
      >
        {checked ? "✓" : ""}
      </button>

      {/* Word */}
      <span
        style={{
          flex: 1,
          fontSize: 17.5,
          fontWeight: 600,
          color: excluded ? "#9C8467" : "#4A331C",
          textDecoration: excluded ? "line-through" : "none",
        }}
      >
        {word}
      </span>

      {/* Edit button */}
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit word"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "1.5px solid #EDDFC9",
          background: "#FFFBF4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          cursor: "pointer",
        }}
      >
        <PencilGlyph />
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove word"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          cursor: "pointer",
          background: "none",
          border: "none",
        }}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

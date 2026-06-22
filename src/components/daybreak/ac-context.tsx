// ACContext — Daybreak Add-a-Card persistent context line.
// Shows: LangChip(native) → LangChip(target) · "saves to your <deck>"
// Uses the shared LangChip atom (no flag emoji — L-01).

import { LangChip } from "@/components/daybreak/lang-chip";

interface ACContextProps {
  nativeLang: string;
  targetLang: string;
  targetDeckName: string;
}

export function ACContext({
  nativeLang,
  targetLang,
  targetDeckName,
}: ACContextProps) {
  // Derive short chip codes: uppercase the label ("English" → "EN", "Spanish" → "ES").
  // If the label is already short (≤3 chars) use it as-is.
  function toChipCode(label: string): string {
    return label.trim().slice(0, 2).toUpperCase();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      <LangChip code={toChipCode(nativeLang)} />
      <span
        aria-hidden="true"
        style={{ fontSize: 14, color: "#9C8467", fontWeight: 700 }}
      >
        →
      </span>
      <LangChip code={toChipCode(targetLang)} />
      <span style={{ fontSize: 13, color: "#9C8467" }}>
        · saves to your{" "}
        <span style={{ fontWeight: 700, color: "#4A331C" }}>
          {targetDeckName}
        </span>
      </span>
    </div>
  );
}

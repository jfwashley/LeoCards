// Daybreak language chip — compact text chip (EN / ES / FR).
// Extracted from deck-switcher.tsx so Add-a-Card context line and the
// deck-switcher share one definition (D-02).

interface LangChipProps {
  code: string;
  size?: number;
}

export function LangChip({ code, size = 24 }: LangChipProps) {
  return (
    <span
      style={{
        width: size + 7,
        height: size,
        borderRadius: 6,
        background: "#FFF1DC",
        border: "1px solid #F0E3CF",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.46,
        fontWeight: 700,
        color: "#B4762A",
        letterSpacing: 0.3,
        flex: "none",
        boxSizing: "border-box",
      }}
    >
      {code}
    </span>
  );
}

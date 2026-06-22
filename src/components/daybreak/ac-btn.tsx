import type * as React from "react";

// ACBtn — Daybreak multi-variant button.
// Always renders a real <button> element so getByRole("button", { name }) resolves
// in Playwright and @testing-library (Pitfall 2 — L-06).
// kind="disabled" sets the HTML disabled attribute (not purely visual).

type ACBtnKind = "primary" | "disabled" | "ghost" | "ghost-danger";

interface ACBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ACBtnKind;
  icon?: React.ReactNode;
}

const KIND_STYLES: Record<ACBtnKind, React.CSSProperties> = {
  primary: {
    background: "#F28A1F",
    color: "#FFFFFF",
    boxShadow: "0 10px 22px rgba(242,138,31,0.30)",
    border: "none",
  },
  disabled: {
    background: "#F4E7D2",
    color: "#B49B78",
    border: "none",
    cursor: "not-allowed",
  },
  ghost: {
    background: "#FFFFFF",
    border: "1.5px solid #EDDFC9",
    color: "#4A331C",
  },
  "ghost-danger": {
    background: "#FFFFFF",
    border: "1.5px solid #DE5F4A",
    color: "#DE5F4A",
  },
};

export function ACBtn({
  kind = "primary",
  icon,
  children,
  style,
  ...props
}: ACBtnProps) {
  const kindStyle = KIND_STYLES[kind];
  return (
    <button
      disabled={kind === "disabled" || props.disabled}
      style={{
        height: 54,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 18,
        boxSizing: "border-box",
        width: "100%",
        cursor: kind === "disabled" ? "not-allowed" : "pointer",
        ...kindStyle,
        ...style,
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

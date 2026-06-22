// ACStepper — Daybreak five-dot stage indicator.
// Stages: Image · Extract · Review · Translate · Add (AC_STAGES, D-05).
// Pick is pre-stepper; Result lives under the "Add" dot — no 6th dot.
// Presentational only — consumer passes the active stage index (0-based).

const AC_STAGES = ["Image", "Extract", "Review", "Translate", "Add"] as const;

interface ACStepperProps {
  /** 0-based index of the currently active stage (0=Image, 1=Extract, …) */
  current: number;
}

export function ACStepper({ current }: ACStepperProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        flex: "none",
        padding: "0 4px",
      }}
    >
      {AC_STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;

        const dotBg = active ? "#F28A1F" : done ? "#FCE4BE" : "#F1E6D2";
        const dotBorder = active || done ? "#F28A1F" : "#E4D4BA";
        const dotColor = active ? "#FFF" : done ? "#C96F12" : "#9C8467";
        const labelColor = active ? "#4A331C" : "#9C8467";

        return (
          <div
            key={stage}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: i < AC_STAGES.length - 1 ? "none" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                flex: "none",
                width: 52,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  boxSizing: "border-box",
                  border: `2px solid ${dotBorder}`,
                  background: dotBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: dotColor,
                  flex: "none",
                }}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? 700 : 600,
                  color: labelColor,
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {stage}
              </span>
            </div>
            {i < AC_STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2.5,
                  borderRadius: 2,
                  background: done ? "#F28A1F" : "#E4D4BA",
                  marginTop: 11,
                  minWidth: 8,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

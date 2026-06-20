// Daybreak "Leo" mascot — flat-geometric lion head, drawn with CSS/DOM geometry.
// Ported 1:1 from the design handoff (hifi-shared.jsx → LionFace). CSS placeholder
// per the redesign brief: shippable as-is, swappable for commissioned art later —
// keep the Daybreak palette. Pure (no hooks) so it is RSC-safe.

interface LionFaceProps {
  size?: number;
  mane?: string;
  face?: string;
  muzzle?: string;
  ink?: string;
  /** Optional outline (used on busy scene backgrounds). */
  outline?: string;
  className?: string;
}

export function LionFace({
  size = 80,
  mane = "#E8973B",
  face = "#FFD9A6",
  muzzle = "#FFF1DC",
  ink = "#4A331C",
  outline,
  className,
}: LionFaceProps) {
  const s = size;
  const u = (n: number) => (n / 100) * s;
  const ob = outline
    ? `${Math.max(1.5, s * 0.028)}px solid ${outline}`
    : "none";
  const disc = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    background: face,
    borderRadius: "50%",
    border: ob,
    boxSizing: "border-box",
    ...extra,
  });
  return (
    <div
      className={className}
      style={{ width: s, height: s, position: "relative", flex: "none" }}
      aria-hidden="true"
    >
      {/* mane disc */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: mane,
          borderRadius: "50%",
          border: ob,
          boxSizing: "border-box",
        }}
      />
      {/* ears */}
      <div
        style={disc({ left: u(13), top: u(6), width: u(20), height: u(20) })}
      />
      <div
        style={disc({ right: u(13), top: u(6), width: u(20), height: u(20) })}
      />
      {/* face */}
      <div
        style={disc({ left: u(17), top: u(17), width: u(66), height: u(66) })}
      />
      {/* eyes */}
      <div
        style={{
          position: "absolute",
          left: u(35),
          top: u(42),
          width: u(6),
          height: u(6),
          background: ink,
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: u(35),
          top: u(42),
          width: u(6),
          height: u(6),
          background: ink,
          borderRadius: "50%",
        }}
      />
      {/* muzzle + nose */}
      <div
        style={{
          position: "absolute",
          left: u(37),
          top: u(56),
          width: u(26),
          height: u(18),
          background: muzzle,
          borderRadius: "46% 46% 50% 50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: u(46.5),
          top: u(56),
          width: u(7),
          height: u(6),
          background: ink,
          borderRadius: "40% 40% 60% 60%",
        }}
      />
    </div>
  );
}

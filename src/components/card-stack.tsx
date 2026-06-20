"use client";

interface CardStackProps {
  remainingCount: number;
}

export function CardStack({ remainingCount }: CardStackProps) {
  const visibleLayers = Math.min(3, remainingCount);

  if (visibleLayers === 0) return null;

  const opacities = [0.6, 0.35, 0.15];

  return (
    <>
      {Array.from({ length: visibleLayers }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static positional layers, never reordered
          key={i}
          className="absolute inset-0"
          style={{
            transform: `translateY(${(i + 1) * 8}px) scale(${1 - (i + 1) * 0.03})`,
            zIndex: -(i + 1),
            opacity: opacities[i],
            borderRadius: 22,
            background: "#FFFFFF",
            border: "1px solid #F0E3CF",
            boxSizing: "border-box",
          }}
        />
      ))}
    </>
  );
}

import * as React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// The Daybreak card surface — white, radius 22, amber border + shadow.
// Matches the inner card surface in auth-card.tsx. Use for non-auth screens
// (empty states, welcome steps) where the ghost-peek stack is not needed.
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 22,
        background: "#FFFFFF",
        border: "1px solid #F0E3CF",
        boxShadow: "0 12px 30px rgba(160, 110, 40, 0.16)",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

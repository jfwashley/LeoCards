"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import type { HabitatState } from "@/lib/habitat-engine";

// Loading spinner shown while PixiJS and sprite assets initialize (D-18)
function HabitatLoadingSpinner() {
  return (
    <div className="w-full flex items-center justify-center" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
      <svg
        className="animate-spin h-10 w-10 text-orange-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-label="Loading habitat"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

// SSR-safe: ssr:false only works inside "use client" modules (Next.js 16 rule)
const HabitatCanvas = dynamic(
  () => import("@/components/habitat-canvas"),
  {
    ssr: false,
    loading: () => <HabitatLoadingSpinner />,
  }
);

export function HabitatScene({ habitatState }: { habitatState: HabitatState }) {
  return (
    // D-19: scene fades in from loading state over ~0.5s
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <HabitatCanvas habitatState={habitatState} />
    </motion.div>
  );
}

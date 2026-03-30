"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { HabitatState } from "@/lib/habitat-engine";
import { LEVEL_THRESHOLDS } from "@/lib/habitat-engine";

// SSR-safe: ssr:false only works inside "use client" modules (Next.js 16 rule)
const HabitatWidgetCanvas = dynamic(
  () => import("@/components/habitat-widget-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[80px] animate-pulse bg-amber-50 rounded" />
    ),
  },
);

interface HabitatWidgetProps {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}

export const HabitatWidget = React.memo(function HabitatWidget({
  habitatState,
  celebratingLevel = null,
}: HabitatWidgetProps) {
  const { level, learnedCardCount, nextLevelThreshold, mood } = habitatState;

  // Calculate progress percentage toward next level
  let progressPct: number;
  if (nextLevelThreshold === null) {
    progressPct = 100;
  } else {
    const prevThreshold = level >= 2 ? (LEVEL_THRESHOLDS[level - 2] ?? 0) : 0;
    const range = nextLevelThreshold - prevThreshold;
    if (range <= 0) {
      progressPct = 100;
    } else {
      progressPct = Math.min(
        100,
        Math.max(0, ((learnedCardCount - prevThreshold) / range) * 100),
      );
    }
  }

  return (
    <Link
      href={
        celebratingLevel ? `/habitat?celebrate=${celebratingLevel}` : "/habitat"
      }
      className="block"
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <HabitatWidgetCanvas mood={mood} />
          <div className="mt-3">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Level {level}</span>
              <span>
                {learnedCardCount}/{nextLevelThreshold ?? "MAX"} cards
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

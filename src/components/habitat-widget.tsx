"use client";

import Link from "next/link";
import React from "react";
import HabitatWidgetImage from "@/components/habitat-3d-widget-image";
import { Card, CardContent } from "@/components/ui/card";
import type { HabitatState } from "@/lib/habitat-engine";
import { LEVEL_THRESHOLDS } from "@/lib/habitat-engine";

// Phase 13 Plan 06 — D-28 = CACHED. The live 3D widget is replaced by a
// static <Image>-based variant per level. next/image is SSR-safe so the
// previous dynamic({ ssr: false }) wrapper is no longer needed.
const HabitatWidgetCanvas = HabitatWidgetImage;

interface HabitatWidgetProps {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}

export const HabitatWidget = React.memo(function HabitatWidget({
  habitatState,
  celebratingLevel = null,
}: HabitatWidgetProps) {
  const { level, learnedCardCount, nextLevelThreshold } = habitatState;

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
          <HabitatWidgetCanvas habitatState={habitatState} />
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

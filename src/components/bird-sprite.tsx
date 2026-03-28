"use client";

import { useTick } from "@pixi/react";
import type { Spritesheet, Ticker } from "pixi.js";
import { useCallback, useRef, useState } from "react";

// ============================================================
// Props
// ============================================================

interface BirdSpriteProps {
  sheet: Spritesheet;
  sceneWidth: number;
  sceneHeight: number;
  isFirstAppearance: boolean;
}

// ============================================================
// BirdSprite: fly-in animation from off-screen at level 10
// Follows TigerSprite pattern: useTick + useCallback, useRef for
// animation state, lazy useState initializer for SSR safety (Pitfall 7)
// ============================================================

export function BirdSprite({
  sheet,
  sceneWidth,
  sceneHeight,
  isFirstAppearance,
}: BirdSpriteProps) {
  const restX = sceneWidth * 0.75;
  const restY = sceneHeight * 0.3;

  // Lazy initializer prevents SSR hydration mismatch (Pitfall 7)
  const [x, setX] = useState(() =>
    isFirstAppearance ? sceneWidth + 100 : restX,
  );
  const [y] = useState(() => restY);

  // Capture isFirstAppearance on mount — never re-read from props (Pitfall 3)
  const isAnimatingRef = useRef(isFirstAppearance);
  const frameRef = useRef(0);

  // Cubic ease-out fly-in over 60 frames (~1s at 60fps)
  const onTick = useCallback(
    (ticker: Ticker) => {
      if (!isAnimatingRef.current) return;

      frameRef.current += ticker.deltaTime;
      const t = Math.min(frameRef.current / 60, 1);

      // Cubic ease-out: 1 - (1 - t)^3
      const eased = 1 - (1 - t) ** 3;
      const startX = sceneWidth + 100;
      const currentX = startX + (restX - startX) * eased;
      setX(currentX);

      if (t >= 1) {
        isAnimatingRef.current = false;
        setX(restX);
      }
    },
    [sceneWidth, restX],
  );

  useTick(onTick);

  // Guard: if the texture doesn't exist yet (placeholder not loaded), render nothing
  if (!sheet.textures["layer-bird"]) return null;

  const birdSize = sceneHeight * 0.08;

  return (
    <pixiSprite
      texture={sheet.textures["layer-bird"]}
      x={x}
      y={y}
      anchor={0.5}
      width={birdSize}
      height={birdSize}
    />
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTick } from "@pixi/react";
import type { Spritesheet, Ticker, Texture } from "pixi.js";
import { getMoodTransitionType, getTigerFacing, getTigerPosition } from "@/lib/habitat-ui-utils";
import type { TigerMood } from "@/lib/habitat-engine";

// ============================================================
// Helpers
// ============================================================

function getMoodTexture(mood: TigerMood, sheet: Spritesheet): Texture | null {
  if (mood === "excited") {
    return sheet.textures["tiger/excited/01.png"] ?? null;
  }
  return sheet.textures[`tiger/${mood}.png`] ?? null;
}

// ============================================================
// BounceAnimator: sub-component that runs the bounce tick loop
// when transitioning to a happier mood (D-06)
// ============================================================

interface BounceAnimatorProps {
  onTick: (ticker: Ticker) => void;
}

function BounceAnimator({ onTick }: BounceAnimatorProps) {
  useTick(useCallback(onTick, [onTick]));
  return null;
}

// ============================================================
// CrossfadeAnimator: sub-component that animates alpha transition
// when transitioning to a sadder mood (D-06)
// ============================================================

interface CrossfadeAnimatorProps {
  onTick: (ticker: Ticker) => void;
}

function CrossfadeAnimator({ onTick }: CrossfadeAnimatorProps) {
  useTick(useCallback(onTick, [onTick]));
  return null;
}

// ============================================================
// TigerSprite
// ============================================================

interface TigerSpriteProps {
  mood: TigerMood;
  sheet: Spritesheet;
  sceneWidth: number;
  sceneHeight: number;
}

export function TigerSprite({ mood, sheet, sceneWidth, sceneHeight }: TigerSpriteProps) {
  // Random position and facing chosen once on mount (D-04, D-05)
  // Lazy initializers prevent SSR/hydration mismatch (Pitfall 7)
  const [position] = useState(() => getTigerPosition());
  const [facing] = useState(() => getTigerFacing());

  // Tiger size: 18% of scene height (D-03: 15-20%)
  const tigerSize = sceneHeight * 0.18;
  const tigerX = position.x * sceneWidth;
  const tigerY = sceneHeight * 0.75;

  // Current and previous textures for crossfade
  const [currentTexture, setCurrentTexture] = useState<Texture | null>(
    () => getMoodTexture(mood, sheet),
  );
  const [prevTexture, setPrevTexture] = useState<Texture | null>(null);
  const prevMoodRef = useRef<TigerMood>(mood);

  // Animation state — using refs to avoid setState in useTick (Pitfall 3)
  const [isBouncing, setIsBouncing] = useState(false);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const bounceFrameRef = useRef(0);
  const bounceYRef = useRef(0);
  const crossfadeFrameRef = useRef(0);
  const oldAlphaRef = useRef(1);
  const newAlphaRef = useRef(0);

  // Force re-render refs by tracking render-triggering values in state
  const [bounceY, setBounceY] = useState(0);
  const [oldAlpha, setOldAlpha] = useState(1);
  const [newAlpha, setNewAlpha] = useState(0);

  // Handle mood change — determine transition type and set up animation
  useEffect(() => {
    const prevMood = prevMoodRef.current;
    if (prevMood === mood) return;

    const transitionType = getMoodTransitionType(prevMood, mood);
    const newTexture = getMoodTexture(mood, sheet);

    if (transitionType === "bounce") {
      // Instant texture swap + bounce animation
      setCurrentTexture(newTexture);
      setPrevTexture(null);
      bounceFrameRef.current = 0;
      bounceYRef.current = 0;
      setIsBouncing(true);
      setIsCrossfading(false);
    } else if (transitionType === "crossfade") {
      // Keep old texture visible while fading in new texture
      setPrevTexture(currentTexture);
      setCurrentTexture(newTexture);
      crossfadeFrameRef.current = 0;
      oldAlphaRef.current = 1;
      newAlphaRef.current = 0;
      setOldAlpha(1);
      setNewAlpha(0);
      setIsCrossfading(true);
      setIsBouncing(false);
    } else {
      // Instant swap, no animation
      setCurrentTexture(newTexture);
      setPrevTexture(null);
      setIsBouncing(false);
      setIsCrossfading(false);
    }

    prevMoodRef.current = mood;
  }, [mood, sheet, currentTexture]);

  // Bounce tick handler (D-06: 0.4s = ~24 frames at 60fps)
  const handleBounceTick = useCallback(
    (ticker: Ticker) => {
      bounceFrameRef.current += ticker.deltaTime;
      const t = bounceFrameRef.current;
      // Spring-like bounce using sine: amplitude 8px, decays over 24 frames
      const decay = Math.max(0, 1 - t / 24);
      const yOffset = Math.sin(t * 0.15 * Math.PI) * 8 * decay;
      bounceYRef.current = yOffset;
      setBounceY(yOffset);

      if (bounceFrameRef.current >= 24) {
        bounceFrameRef.current = 0;
        setIsBouncing(false);
        setBounceY(0);
      }
    },
    [],
  );

  // Crossfade tick handler (D-06: ~0.5s = 30 frames at 60fps)
  const handleCrossfadeTick = useCallback(
    (ticker: Ticker) => {
      crossfadeFrameRef.current += ticker.deltaTime;
      const progress = Math.min(1, crossfadeFrameRef.current / 30);

      oldAlphaRef.current = 1 - progress;
      newAlphaRef.current = progress;
      setOldAlpha(1 - progress);
      setNewAlpha(progress);

      if (progress >= 1) {
        crossfadeFrameRef.current = 0;
        setIsCrossfading(false);
        setPrevTexture(null);
        setOldAlpha(1);
        setNewAlpha(1);
      }
    },
    [],
  );

  if (!currentTexture) return null;

  const renderY = tigerY + bounceY;

  return (
    <>
      {/* Crossfade: old texture fading out */}
      {isCrossfading && prevTexture && (
        <pixiSprite
          texture={prevTexture}
          x={tigerX}
          y={renderY}
          anchor={0.5}
          width={tigerSize}
          height={tigerSize}
          scale={{ x: facing, y: 1 }}
          alpha={oldAlpha}
        />
      )}

      {/* Current texture (fading in during crossfade, or fully visible otherwise) */}
      <pixiSprite
        texture={currentTexture}
        x={tigerX}
        y={renderY}
        anchor={0.5}
        width={tigerSize}
        height={tigerSize}
        scale={{ x: facing, y: 1 }}
        alpha={isCrossfading ? newAlpha : 1}
      />

      {/* Tick animators — render-nothing components that drive the ticker loops */}
      {isBouncing && <BounceAnimator onTick={handleBounceTick} />}
      {isCrossfading && <CrossfadeAnimator onTick={handleCrossfadeTick} />}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Application, extend, useApplication } from "@pixi/react";
import { Assets, Container, Graphics, Sprite, type Spritesheet } from "pixi.js";
import type { HabitatState } from "@/lib/habitat-engine";
import { TigerSprite } from "@/components/tiger-sprite";
import { HabitatLayers } from "@/components/habitat-layers";
import { SparkleParticles } from "@/components/sparkle-particles";
import { BirdSprite } from "@/components/bird-sprite";
import { getTigerPosition } from "@/lib/habitat-ui-utils";

// Register all PixiJS classes used in JSX — must be called at module scope
// before any JSX referencing these classes renders (Pattern 2 from RESEARCH.md)
extend({ Container, Sprite, Graphics });

// VisibilityController: pauses the PixiJS ticker when the browser tab is hidden (D-22)
// Render-nothing component — lives inside the <Application> tree to access useApplication()
function VisibilityController() {
  const { app } = useApplication();

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        app.ticker.stop();
      } else {
        app.ticker.start();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [app]);

  return null;
}

// useRendererSize: reads the actual PixiJS renderer dimensions and re-renders when they change.
// This ensures sprites always match the canvas size, even when resizeTo resizes it asynchronously.
function useRendererSize() {
  const appContext = useApplication();
  const app = appContext?.app;
  const [size, setSize] = useState({ width: 960, height: 540 });

  useEffect(() => {
    if (!app?.screen) return;

    const check = () => {
      const w = app.screen.width;
      const h = app.screen.height;
      setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
    };

    check();
    app.ticker.add(check);
    return () => { app.ticker.remove(check); };
  }, [app]);

  return size;
}

// Scene: loads sprite atlases and renders the full habitat composition
// Lives inside <Application> so Assets.load() runs in the correct PixiJS context (Pitfall 5)
function Scene({
  habitatState,
  celebratingLevel = null,
}: {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}) {
  const { width: sceneWidth, height: sceneHeight } = useRendererSize();
  const [tigerSheet, setTigerSheet] = useState<Spritesheet | null>(null);
  const [habitatSheet, setHabitatSheet] = useState<Spritesheet | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      Assets.load<Spritesheet>("/sprites/tiger.json"),
      Assets.load<Spritesheet>("/sprites/habitat.json"),
    ]).then(([tiger, habitat]) => {
      if (!cancelled) {
        setTigerSheet(tiger);
        setHabitatSheet(habitat);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // While sheets are loading, render nothing — HabitatScene wrapper shows spinner
  if (!tigerSheet || !habitatSheet) return null;

  // Tiger position for sparkle particle origin — use same lazy position as TigerSprite
  // We compute a stable reference position for the sparkles
  const tigerX = 0.5 * sceneWidth; // default center; TigerSprite chooses its own random position
  const tigerY = sceneHeight * 0.75;

  return (
    <pixiContainer>
      <VisibilityController />

      {/* 1. Habitat background layers (back to front, level-gated, with decay) */}
      <HabitatLayers
        level={habitatState.level}
        quality={habitatState.quality}
        sheet={habitatSheet}
        sceneWidth={sceneWidth}
        sceneHeight={sceneHeight}
      />

      {/* 2. Tiger sprite with mood-reactive textures, random position, and transitions */}
      <TigerSprite
        mood={habitatState.mood}
        sheet={tigerSheet}
        sceneWidth={sceneWidth}
        sceneHeight={sceneHeight}
      />

      {/* 3. Sparkle particles for excited mood (D-07) */}
      <SparkleParticles
        tigerX={tigerX}
        tigerY={tigerY}
        active={habitatState.mood === "excited"}
      />

      {/* 4. Bird sprite at level 10 (D-08, D-09, D-10) */}
      {habitatState.level >= 10 && habitatSheet && (
        <BirdSprite
          sheet={habitatSheet}
          sceneWidth={sceneWidth}
          sceneHeight={sceneHeight}
          isFirstAppearance={celebratingLevel === 10}
        />
      )}
    </pixiContainer>
  );
}

// HabitatCanvas: @pixi/react Application wrapping the full scene tree
// Loaded via next/dynamic with ssr:false from habitat-scene.tsx
export default function HabitatCanvas({
  habitatState,
  celebratingLevel = null,
}: {
  habitatState: HabitatState;
  celebratingLevel?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ aspectRatio: "16/9", maxHeight: "70vh" }}
    >
      <Application resizeTo={containerRef} backgroundAlpha={0}>
        <Scene habitatState={habitatState} celebratingLevel={celebratingLevel} />
      </Application>
    </div>
  );
}

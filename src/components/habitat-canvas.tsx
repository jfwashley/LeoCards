"use client";

import { useEffect, useRef, useState } from "react";
import { Application, extend, useApplication } from "@pixi/react";
import { Assets, Container, Graphics, Sprite, type Spritesheet } from "pixi.js";
import type { HabitatState } from "@/lib/habitat-engine";

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

// Scene: loads sprite atlases and renders the initial placeholder tiger sprite
// Lives inside <Application> so Assets.load() runs in the correct PixiJS context (Pitfall 5)
function Scene({ habitatState }: { habitatState: HabitatState }) {
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

  const happyTexture = tigerSheet.textures["tiger/happy.png"];

  return (
    <pixiContainer>
      <VisibilityController />
      {happyTexture && (
        <pixiSprite
          texture={happyTexture}
          x={50}
          y={50}
        />
      )}
    </pixiContainer>
  );
}

// HabitatCanvas: @pixi/react Application wrapping the full scene tree
// Loaded via next/dynamic with ssr:false from habitat-scene.tsx
export default function HabitatCanvas({ habitatState }: { habitatState: HabitatState }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ aspectRatio: "16/9", maxHeight: "70vh" }}
    >
      <Application resizeTo={containerRef}>
        <Scene habitatState={habitatState} />
      </Application>
    </div>
  );
}

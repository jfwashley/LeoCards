"use client";

import { Application, extend } from "@pixi/react";
import { Assets, Container, Sprite, type Spritesheet } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import type { TigerMood } from "@/lib/habitat-engine";

// Register PixiJS classes used in JSX — must be at module scope
extend({ Container, Sprite });

// Mood to texture name mapping (same as TigerSprite in main canvas)
const MOOD_TEXTURE: Record<TigerMood, string> = {
  excited: "tiger/excited/01.png",
  happy: "tiger/happy.png",
  neutral: "tiger/neutral.png",
  sad: "tiger/sad.png",
};

// Scene renders a small tiger sprite centered in the widget canvas
function WidgetScene({ mood }: { mood: TigerMood }) {
  const [tigerSheet, setTigerSheet] = useState<Spritesheet | null>(null);

  useEffect(() => {
    let cancelled = false;
    Assets.load<Spritesheet>("/sprites/tiger.json").then((sheet) => {
      if (!cancelled) setTigerSheet(sheet);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!tigerSheet) return null;

  const textureName = MOOD_TEXTURE[mood];
  const texture = tigerSheet.textures[textureName];

  if (!texture) return null;

  return (
    <pixiContainer>
      {/* Tiger sprite centered and scaled to ~30% of 80px canvas height */}
      <pixiSprite
        texture={texture}
        anchor={{ x: 0.5, y: 0.5 }}
        x={0.5}
        y={0.5}
        width={24}
        height={24}
      />
    </pixiContainer>
  );
}

export default function HabitatWidgetCanvas({ mood }: { mood: TigerMood }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "80px" }}>
      <Application resizeTo={containerRef}>
        <WidgetScene mood={mood} />
      </Application>
    </div>
  );
}

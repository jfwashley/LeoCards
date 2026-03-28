"use client";

import type { Spritesheet } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { getDecayAlpha, getLayersForLevel } from "@/lib/habitat-ui-utils";

// ============================================================
// Parallax depth groups (D-11)
// ============================================================

const BACKGROUND_LAYERS = new Set(["layer-sky", "layer-hills"]);
const FOREGROUND_LAYERS = new Set(["layer-grass-base"]);
// Mid-ground: everything else (trees, rocks, water, flowers, animals)

// Base layers that never decay (always at alpha 1.0)
const BASE_LAYERS = new Set(["layer-sky", "layer-hills", "layer-grass-base"]);

// ============================================================
// LEVEL_LAYERS constant — maps level to ordered layer names
// Used as a labeled reference in this module (per must_haves artifact)
// ============================================================
const LEVEL_LAYERS = {
  1: ["layer-sky", "layer-hills", "layer-grass-base", "layer-tree-1"],
  2: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
  ],
  3: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
  ],
  4: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
  ],
  5: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
    "layer-water-1",
  ],
  6: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
    "layer-water-1",
    "layer-animal-1",
  ],
  7: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
    "layer-water-1",
    "layer-animal-1",
    "layer-tree-3",
  ],
  8: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
    "layer-water-1",
    "layer-animal-1",
    "layer-tree-3",
    "layer-flowers-2",
  ],
  9: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
    "layer-water-1",
    "layer-animal-1",
    "layer-tree-3",
    "layer-flowers-2",
    "layer-animal-2",
  ],
  10: [
    "layer-sky",
    "layer-hills",
    "layer-grass-base",
    "layer-tree-1",
    "layer-rocks-1",
    "layer-tree-2",
    "layer-flowers-1",
    "layer-water-1",
    "layer-animal-1",
    "layer-tree-3",
    "layer-flowers-2",
    "layer-animal-2",
    "layer-water-2",
  ],
} as const;

// Export for external use
export { LEVEL_LAYERS };

// ============================================================
// HabitatLayers
// ============================================================

interface HabitatLayersProps {
  level: number;
  quality: number;
  sheet: Spritesheet;
  sceneWidth: number;
  sceneHeight: number;
}

export function HabitatLayers({
  level,
  quality,
  sheet,
  sceneWidth,
  sceneHeight,
}: HabitatLayersProps) {
  // Normalized mouse x (0-1) for parallax offset (D-11)
  const mouseXRef = useRef(0.5);
  const [mouseX, setMouseX] = useState(0.5);

  // Add mousemove listener for parallax (D-11)
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const normalized = e.clientX / window.innerWidth;
      mouseXRef.current = normalized;
      setMouseX(normalized);
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Get layers to render for this level
  const layers = getLayersForLevel(level);

  // Decay alpha for level-added layers (D-13)
  const decayAlpha = getDecayAlpha(quality);

  // Level-added layers: index of first non-base layer
  const levelAddedLayers = layers.filter((name) => !BASE_LAYERS.has(name));
  const levelAddedCount = levelAddedLayers.length;

  return (
    <>
      {layers.map((layerName, _layerIndex) => {
        const texture = sheet.textures[layerName];
        if (!texture) return null;

        // Calculate parallax offset based on depth group (D-11)
        let offsetX = 0;
        if (BACKGROUND_LAYERS.has(layerName)) {
          // Background: subtle 2% shift
          offsetX = (mouseX - 0.5) * sceneWidth * 0.02;
        } else if (!FOREGROUND_LAYERS.has(layerName)) {
          // Mid-ground: 5% shift
          offsetX = (mouseX - 0.5) * sceneWidth * 0.05;
        }
        // Foreground (grass-base): no shift

        // Alpha calculation
        let alpha = 1.0;
        if (!BASE_LAYERS.has(layerName) && quality < 1.0) {
          // Level-added layers: apply decay, higher-index layers decay more strongly
          // The last layer gets the full decay effect, earlier layers are more resilient (D-13)
          const levelIndex = levelAddedLayers.indexOf(layerName);
          if (levelIndex >= 0) {
            // Interpolate: most recent layer uses full decay, older layers are more resilient
            // Resilience factor: 0.0 for last layer (full decay), up to 0.5 for first layer
            const resilienceFactor =
              levelAddedCount > 1
                ? 0.5 * (1 - levelIndex / (levelAddedCount - 1))
                : 0;
            alpha = Math.min(
              1,
              decayAlpha + resilienceFactor * (1 - decayAlpha),
            );
          }
        }

        return (
          <pixiSprite
            key={layerName}
            texture={texture}
            x={offsetX}
            y={0}
            width={sceneWidth}
            height={sceneHeight}
            alpha={alpha}
          />
        );
      })}
    </>
  );
}

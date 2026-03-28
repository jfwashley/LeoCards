"use client";

import { useCallback, useRef } from "react";
import { useTick } from "@pixi/react";
import type { Graphics, Ticker } from "pixi.js";

// ============================================================
// Sparkle particle type
// ============================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

// ============================================================
// Constants
// ============================================================

const PARTICLE_COUNT = 10; // 8-12 particles per D-07
const ORANGE_COLOR = 0xF97316; // --primary hsl(24 95% 53%) per UI-SPEC
const FADE_DURATION = 40; // frames to fade from 1.0 to 0.0

function createParticle(tigerX: number, tigerY: number): Particle {
  // Random position near tiger (spread within ±40px)
  const spread = 40;
  return {
    x: tigerX + (Math.random() - 0.5) * spread,
    y: tigerY + (Math.random() - 0.5) * spread,
    // Upward velocity with slight horizontal drift
    vx: (Math.random() - 0.5) * 2,
    vy: -(Math.random() * 2 + 1),
    // Random size 2-4px
    size: 2 + Math.random() * 2,
    alpha: Math.random(), // stagger initial alpha so they don't all spawn at once
  };
}

// ============================================================
// SparkleParticles
// ============================================================

interface SparkleParticlesProps {
  tigerX: number;
  tigerY: number;
  active: boolean;
}

export function SparkleParticles({ tigerX, tigerY, active }: SparkleParticlesProps) {
  // Particles stored in a ref to avoid state updates in useTick (Pitfall 3)
  const particlesRef = useRef<Particle[]>([]);

  // Initialize particles when becoming active
  const isInitializedRef = useRef(false);

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (!active) return;

      // Initialize particles on first active frame
      if (!isInitializedRef.current) {
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
          createParticle(tigerX, tigerY),
        );
        isInitializedRef.current = true;
      }

      for (const particle of particlesRef.current) {
        g.circle(particle.x, particle.y, particle.size);
        g.fill({ color: ORANGE_COLOR, alpha: particle.alpha });
      }
    },
    [active, tigerX, tigerY],
  );

  const onTick = useCallback(
    (ticker: Ticker) => {
      if (!active) {
        isInitializedRef.current = false;
        return;
      }

      // Initialize on first tick if needed
      if (!isInitializedRef.current || particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
          createParticle(tigerX, tigerY),
        );
        isInitializedRef.current = true;
      }

      const dt = ticker.deltaTime;

      for (const particle of particlesRef.current) {
        // Move particle
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;

        // Fade out over FADE_DURATION frames
        particle.alpha -= dt / FADE_DURATION;

        // Respawn when fully faded (continuous loop per D-07)
        if (particle.alpha <= 0) {
          const respawned = createParticle(tigerX, tigerY);
          particle.x = respawned.x;
          particle.y = respawned.y;
          particle.vx = respawned.vx;
          particle.vy = respawned.vy;
          particle.size = respawned.size;
          particle.alpha = 1.0;
        }
      }
    },
    [active, tigerX, tigerY],
  );

  useTick(onTick);

  if (!active) return null;

  return (
    <pixiGraphics
      draw={draw}
    />
  );
}

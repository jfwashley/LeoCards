"use client";

import { useEffect, useState } from "react";

// QA-mode state badge — server-gated via readQaAuth() in RSC pages.
// This component is ONLY rendered when qaCardData prop is non-null.
// Customers receive no prop → component never mounts → no DOM element, no interval.
// (Threat T-14-07 mitigation: badge absent from customer DOM, not CSS-hidden)

export interface QaCardData {
  masteryRound: number;
  stage: "n2t" | "t2n";
  cooldownUntil: Date | null;
  pausedAt: Date | null;
}

/**
 * Format remaining milliseconds as a compact cooldown string.
 * Returns "" when ms <= 0 (expired or no cooldown).
 * Uses Math.ceil so partial minutes always show the higher value.
 * Examples: 14*60_000 → "14m", 90*60_000 → "1h30m", 0 → ""
 */
export function formatCd(ms: number): string {
  if (ms <= 0) return "";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

/**
 * Assemble the state-code token array from card data + current cooldown label.
 * Exported for unit testing without DOM.
 *
 * Token format (D-07): tokens joined with "·"
 * - R{masteryRound} — always present
 * - Direction (n2t/t2n) OR "L" when learned (masteryRound >= 3)
 * - cd:{cdLabel} — only when cdLabel is non-empty
 * - P — when pausedAt is non-null
 *
 * Examples: "R0·n2t", "R1·t2n·cd:22m", "R3·L", "R1·t2n·P"
 */
export function buildTokens(data: QaCardData, cdLabel: string): string[] {
  const learned = data.masteryRound >= 3;
  return [
    `R${data.masteryRound}`,
    learned ? "L" : data.stage,
    cdLabel ? `cd:${cdLabel}` : "",
    data.pausedAt ? "P" : "",
  ].filter(Boolean);
}

/**
 * QA state badge — renders a top-right monospace overlay on a `relative`-positioned
 * parent showing per-card SRS state codes with a live cooldown countdown.
 *
 * Hydration-safe: useState lazy initializer evaluates only on client (first render),
 * avoiding server/client timestamp mismatch (RESEARCH pitfall 2 / T-14-10 mitigation).
 *
 * The countdown interval picks granularity based on remaining time:
 * - >= 5 min remaining: 60s ticks (matches deck-view.tsx CountdownTimer)
 * - < 5 min remaining: 10s ticks (fine-grained for short QA cooldowns per D-06)
 */
export function QaStateBadge({ data }: { data: QaCardData }) {
  // Lazy initializer — client-only, avoids hydration mismatch (RESEARCH pitfall 2)
  const [cdLabel, setCdLabel] = useState(() =>
    data.cooldownUntil
      ? formatCd(data.cooldownUntil.getTime() - Date.now())
      : "",
  );

  useEffect(() => {
    const target = data.cooldownUntil;
    if (!target) return;

    const tick = () => {
      const ms = target.getTime() - Date.now();
      setCdLabel(ms > 0 ? formatCd(ms) : "");
    };

    tick(); // Immediately sync on mount

    // Fine-grained tick for short QA cooldowns (< 5 min), coarser otherwise (D-06)
    const intervalMs =
      target.getTime() - Date.now() < 5 * 60_000 ? 10_000 : 60_000;
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [data.cooldownUntil]);

  const tokens = buildTokens(data, cdLabel);

  return (
    <span
      data-qa-badge
      aria-hidden="true"
      className="absolute top-1 right-1 z-20 font-mono text-[10px] bg-black/40 text-white/90 rounded px-1 py-0.5 pointer-events-none select-none"
    >
      {tokens.join("·")}
    </span>
  );
}

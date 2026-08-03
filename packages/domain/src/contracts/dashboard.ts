import type { HabitatState } from "../habitat";

/**
 * Wire shape for the native-v1 dashboard-load endpoint (GET /api/dashboard).
 *
 * hasDueCards / dueCount / earliestCooldownEnd / allPaused / sleeping are
 * explicit fields, NOT something a client re-derives — RESEARCH Pitfall 9:
 * the web dashboard computes these inline from the same packages/domain
 * primitives (assembleSession, earliestCooldownEnd), so native must receive
 * the identical answer rather than reimplementing "what counts as due"
 * itself (D-07's "identical by construction" guarantee).
 *
 * needsOnboarding replaces the web page's redirect to the welcome flow when
 * the user has zero decks — a redirect has no HTTP equivalent.
 *
 * All Dates are ISO strings on the wire.
 */
export interface DashboardResponse {
  needsOnboarding: boolean;
  decks: Array<{ id: string; name: string; language: string }>;
  activeDeckId: string | null;
  nativeLanguage: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
    source: string;
    masteryRound: number;
    pausedAt: string | null;
    cooldownUntil: string | null;
  }>;
  hasDueCards: boolean;
  dueCount: number;
  earliestCooldownEnd: string | null;
  allPaused: boolean;
  sleeping: boolean;
  /** Reused directly from ../habitat — never re-declared. */
  habitat: HabitatState;
}

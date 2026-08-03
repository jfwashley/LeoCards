/**
 * Wire shape for the native-v1 study-session-load endpoint (GET /api/study).
 *
 * StudySessionCardWire mirrors SessionCard (packages/domain/src/study) with
 * its Date fields serialised to ISO strings for the wire — a serialised
 * mirror, not a re-export.
 *
 * An empty session is `{ cards: [] }` with HTTP 200 — the web page's
 * redirect to the dashboard on an empty session has no HTTP equivalent; the
 * native client decides its own empty-state UI.
 */
export interface StudySessionCardWire {
  id: string;
  front: string;
  back: string;
  masteryRound: number;
  cooldownUntil: string | null;
  createdAt: string;
  isResurface: boolean;
  stage: "n2t" | "t2n";
}

export interface StudySessionResponse {
  deckId: string;
  cards: StudySessionCardWire[];
}

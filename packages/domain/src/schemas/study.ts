import { z } from "zod";

export const GradeSchema = z.object({
  cardId: z.string(),
  direction: z.enum(["n2t", "t2n"]),
  correct: z.boolean(),
});

export const CommitSchema = z.object({
  deckId: z.string(),
  // Per-session idempotency key (UUID from the client, stable across retries).
  // Required so a replayed batch (study-session.tsx RETRY_COMMIT) is a no-op
  // rather than a double-apply (WR-04). Bounded because it is concatenated into
  // recall_events primary keys.
  commitId: z.string().min(1).max(100),
  grades: z.array(GradeSchema).min(1).max(500),
});

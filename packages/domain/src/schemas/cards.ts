import { z } from "zod";

// T-28.1-12: explicit allow-listed fields only — unknown keys on the request
// body are dropped, never accepted (over-posting / mass-assignment control),
// mirroring saveCard's existing behaviour and saveImageCards's already-shipped
// 500-char bounds.
export const CreateCardSchema = z.object({
  deckId: z.string().min(1),
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(500),
  source: z.enum(["manual", "wordlist", "image"]).default("manual"),
});

import { z } from "zod";

// T-28.1-11: mirrors deck-actions.ts's ALLOWED_LANGUAGES set exactly (SEC-06
// allow-list) — widening this would be a security regression.
export const CreateDeckSchema = z.object({
  language: z.enum(["fr", "es", "en"]),
});

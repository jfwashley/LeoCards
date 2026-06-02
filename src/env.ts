import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    RESEND_API_KEY: z.string().min(1).optional(),
    DEEPL_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    // Phase 13.2 QA cheat console. The debug feature (force habitat level/mood/
    // quality via /debug) is ENABLED iff this secret is set. Unset = endpoints
    // 404 and /debug shows "disabled". Set it on Vercel preview + production
    // for QA; mints the HMAC-signed override cookie (see src/lib/debug-cheat.ts).
    DEBUG_CHEAT_SECRET: z.string().min(16).optional(),
    // QA: when "true", study-round cooldowns are zeroed so a card can progress
    // 0->learned across reloaded sessions in one sitting. Local dev (NODE_ENV !=
    // production) zeroes them automatically; set this on Vercel PREVIEW only.
    // Leave UNSET on production so real 12h/24h spaced-repetition applies.
    STUDY_NO_COOLDOWN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DEEPL_API_KEY: process.env.DEEPL_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    DEBUG_CHEAT_SECRET: process.env.DEBUG_CHEAT_SECRET,
    STUDY_NO_COOLDOWN: process.env.STUDY_NO_COOLDOWN,
  },
  // Coerce empty strings to undefined BEFORE Zod runs so optional keys
  // (RESEND/DEEPL/ANTHROPIC) gracefully fall through to their existing
  // missing-key paths instead of bricking the whole app at module-eval.
  // Empty-string env vars are common in CI runners, shared shells (Claude
  // Code inherits ANTHROPIC_API_KEY="" by default), Docker base images, and
  // Vercel preview deploys. Caught live by QA on 2026-05-20.
  emptyStringAsUndefined: true,
});

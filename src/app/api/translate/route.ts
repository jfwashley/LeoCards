import * as deepl from "deepl-node";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { createTranslationCache } from "@/lib/translation-cache";

// 30 requests per minute per user — generous for auto-translate, prevents key abuse
const translateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

// PERF-23: bounded in-memory LRU in front of DeepL — same single-instance
// deployment assumptions as the rate limiter above. Translation output is
// deterministic public dictionary content (source text -> target text,
// identical for every user), so sharing the cache across users is safe
// (T-27-06-02). Sized generously (a few thousand entries, ~1h TTL) since
// the value is short strings.
const translationCache = createTranslationCache({
  maxSize: 5000,
  ttlMs: 60 * 60 * 1000,
});

const RequestSchema = z
  .object({
    // Frozen contract — translation-form.tsx's manual live-translate depends
    // on this singular field and the { translation } response shape. Do not
    // remove or repurpose.
    text: z.string().min(1).max(500).optional(),
    // Additive array mode (PERF-09) — review-list.tsx's batch fan-out.
    // .max(50) is a mandatory, independent server-side abuse guard (V5 /
    // T-26-01): one HTTP call must not be able to carry an unbounded array
    // to amplify DeepL cost/volume while spending only 1 of 30 rate-limit
    // slots — independent of /api/extract's own 50-word cap.
    texts: z.array(z.string().min(1).max(500)).min(1).max(50).optional(),
    sourceLang: z.enum(["en", "fr", "es"]),
    targetLang: z.enum(["en", "fr", "es"]),
  })
  .refine((v) => (v.text !== undefined) !== (v.texts !== undefined), {
    message: "Provide exactly one of text or texts",
  });

// DeepL requires specific target language codes
const TARGET_LANG_MAP: Record<string, deepl.TargetLanguageCode> = {
  en: "en-US",
  fr: "fr",
  es: "es",
};

export async function POST(request: Request) {
  // Check authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = translateLimiter.check(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { text, texts, sourceLang, targetLang } = parsed.data;

  // Validate that source and target languages differ
  if (sourceLang === targetLang) {
    return Response.json(
      { error: "Source and target languages must be different" },
      { status: 400 },
    );
  }

  // Instantiate DeepL client inside handler — never at module scope
  if (!env.DEEPL_API_KEY) {
    return Response.json(
      { error: "Translation service not configured" },
      { status: 503 },
    );
  }
  const client = new deepl.DeepLClient(env.DEEPL_API_KEY);

  const targetLangCode = TARGET_LANG_MAP[
    targetLang
  ] as deepl.TargetLanguageCode;

  // Array branch (PERF-09) — before the singular branch. The .refine() above
  // guarantees exactly one of texts/text is present at this point.
  if (texts) {
    // PERF-23: check the cache for every item BEFORE calling DeepL — only
    // the misses are sent to translateText, and each freshly-translated
    // miss is cached for the next request.
    const cachedResults: (string | undefined)[] = texts.map((t) =>
      translationCache.get(t, sourceLang, targetLang),
    );
    const missIndices: number[] = [];
    cachedResults.forEach((v, i) => {
      if (v === undefined) missIndices.push(i);
    });

    if (missIndices.length === 0) {
      return Response.json({ translations: cachedResults as string[] });
    }

    try {
      const missTexts = missIndices.map((i) => texts[i] as string);
      const results = await client.translateText(
        missTexts,
        sourceLang,
        targetLangCode,
      );
      missIndices.forEach((origIdx, k) => {
        const translated = results[k]?.text;
        if (translated !== undefined) {
          cachedResults[origIdx] = translated;
          translationCache.set(
            texts[origIdx] as string,
            sourceLang,
            targetLang,
            translated,
          );
        }
      });
      return Response.json({ translations: cachedResults as string[] });
    } catch {
      return Response.json(
        { error: "Translation service unavailable" },
        { status: 502 },
      );
    }
  }

  // PERF-23: cache check before the singular-branch DeepL call — a hit
  // short-circuits with zero DeepL calls.
  const cachedSingular = translationCache.get(
    text as string,
    sourceLang,
    targetLang,
  );
  if (cachedSingular !== undefined) {
    return Response.json({ translation: cachedSingular });
  }

  try {
    const result = await client.translateText(
      text as string,
      sourceLang,
      targetLangCode,
    );
    translationCache.set(text as string, sourceLang, targetLang, result.text);
    return Response.json({ translation: result.text });
  } catch {
    return Response.json(
      { error: "Translation service unavailable" },
      { status: 502 },
    );
  }
}

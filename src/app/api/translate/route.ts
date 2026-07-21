import * as deepl from "deepl-node";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";

// 30 requests per minute per user — generous for auto-translate, prevents key abuse
const translateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
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
    try {
      const results = await client.translateText(
        texts,
        sourceLang,
        targetLangCode,
      );
      return Response.json({ translations: results.map((r) => r.text) });
    } catch {
      return Response.json(
        { error: "Translation service unavailable" },
        { status: 502 },
      );
    }
  }

  try {
    const result = await client.translateText(
      text as string,
      sourceLang,
      targetLangCode,
    );
    return Response.json({ translation: result.text });
  } catch {
    return Response.json(
      { error: "Translation service unavailable" },
      { status: 502 },
    );
  }
}

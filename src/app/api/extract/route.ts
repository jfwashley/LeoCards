import { anthropic } from "@ai-sdk/anthropic";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_SERVER_IMAGE_BYTES,
} from "@/lib/image-constants";
import { createRateLimiter } from "@/lib/rate-limit";

// D-17: stricter limit — vision calls are expensive (10 req/min vs translate's 30)
const visionLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

// D-13: Vercel route segment timeout — must be explicit on Next.js 16
export const maxDuration = 60;

// D-07: output contract consumed by Phase 11
const ExtractionSchema = z.object({
  words: z
    .array(z.string().min(1).max(100))
    .max(50)
    .describe(
      "Vocabulary words visible in the image as written text, exactly as seen, " +
        "in the target language. Empty array if no readable text found.",
    ),
  detectedLanguage: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional()
    .describe(
      "BCP-47 code of the primary language detected in the image text, e.g. 'fr'. " +
        "Omit if the language is unclear or the image has no readable text.",
    ),
});

// D-09: request body shape
const RequestSchema = z.object({
  image: z.string().min(1), // base64 data-URL: "data:image/jpeg;base64,..."
  mimeType: z.string(), // declared MIME — server must magic-byte verify (D-10)
  deckId: z.string().min(1),
  targetLanguage: z.string(), // BCP-47, e.g. "fr" — biases extraction (D-05)
});

// D-10: magic-byte signature check — hand-rolled, no file-type dep (RESEARCH Section 2)
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46,
};

function checkMagicBytes(dataUrl: string, declaredMimeType: string): boolean {
  const validator = MAGIC[declaredMimeType];
  if (!validator) return false;
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return false;
  // Decode just the first ~12 bytes worth of base64 (~16 base64 chars)
  const b64Payload = dataUrl.slice(commaIndex + 1, commaIndex + 17);
  try {
    const bytes = Uint8Array.from(atob(b64Payload), (c) => c.charCodeAt(0));
    return validator(bytes);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // 1. Auth gate (mirrors translate route)
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit (D-17)
  const limit = visionLimiter.check(session.user.id);
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

  // 3. Content-Length fast path (D-11 — fires before JSON parse)
  const cl = request.headers.get("content-length");
  if (cl && Number(cl) > MAX_SERVER_IMAGE_BYTES) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  // 4. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // 5. Zod validation
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { image, mimeType, targetLanguage } = parsed.data;

  // 6. Authoritative payload size estimate (D-11 — after parse, BEFORE vision call)
  const estimatedBytes = Math.ceil((image.length * 3) / 4);
  if (estimatedBytes > MAX_SERVER_IMAGE_BYTES) {
    return Response.json({ error: "Image too large" }, { status: 413 });
  }

  // 7. MIME allow-list (D-10)
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 415 });
  }

  // 8. Magic-byte verification (D-10 — client mimeType is spoofable)
  if (!checkMagicBytes(image, mimeType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 415 });
  }

  // 9. API key gate (D-03) — Anthropic client instantiated inside handler only (Pitfall 4)
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Vision service not configured" },
      { status: 503 },
    );
  }

  // 10. AbortController for 30s vision timeout (D-13)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    // Instantiate model inside handler — never at module scope (D-03, Pitfall 3)
    // verified 2026-05-19: claude-sonnet-4-6 is current Sonnet-tier vision-capable model id
    // (confirmed against https://ai-sdk.dev/providers/ai-sdk-providers/anthropic — listed on
    // Vercel AI SDK playground as current; no newer Sonnet-tier id has superseded it)
    // Note: anthropic() reads ANTHROPIC_API_KEY from process.env automatically; key presence
    // is validated above (503 guard). No second arg in @ai-sdk/anthropic@3.x API.
    const model = anthropic("claude-sonnet-4-6");

    // System prompt — constraint order per 10-AI-SPEC Section 4b.3
    const system =
      "You are a language-learning assistant. " +
      "Return ONLY words that are visibly present in the image as written text. " +
      `Prioritise words in ${targetLanguage}. ` +
      "Return words exactly as written — do not lemmatize, translate, or normalize. " +
      "Return at most 50 words. " +
      "If no readable text is found, return an empty words array.";

    const { output } = await generateText({
      model,
      output: Output.object({ schema: ExtractionSchema }),
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the vocabulary words from this image. Target language: ${targetLanguage}.`,
            },
            {
              type: "image",
              image,
              // Field is `mediaType` NOT `mimeType` — v6 rename (AI-SPEC Pitfall 2)
              mediaType: mimeType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
            },
          ],
        },
      ],
      maxOutputTokens: 512, // 50 words + detectedLanguage fits comfortably (AI-SPEC Section 4)
      temperature: 0, // extraction task — zero creativity (D-06)
      abortSignal: controller.signal,
    });

    // D-08: empty result is a valid 200 (EXT-03)
    const words = output?.words ?? [];
    return Response.json({
      words: words.slice(0, 50), // enforce cap defensively (D-08)
      detectedLanguage: output?.detectedLanguage,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        { error: "Vision service timed out" },
        { status: 504 },
      );
    }
    if (NoObjectGeneratedError.isInstance(error)) {
      // Model responded but schema validation failed after retries — treat as empty (D-08)
      // Privacy: DO NOT log image bytes or extracted words (AI-SPEC Section 7)
      console.error("[extract] schema validation failed");
      return Response.json({ words: [] });
    }
    // Generic vision error — log metadata only (AI-SPEC Section 7)
    console.error("[extract] vision error");
    return Response.json(
      { error: "Vision service unavailable" },
      { status: 502 },
    );
  } finally {
    // Pitfall 6: clear timer to prevent dangling abort on later requests
    clearTimeout(timeout);
  }
}

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Gated by RUN_EXTRACTION_EVALS=true — do NOT run on every push (hits real Anthropic API)
// Usage: RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts
// Requires: ANTHROPIC_API_KEY in environment + curated fixtures in fixtures/ + reference-labels.json
//
// Reference dataset spec: 10-AI-SPEC.md Section 5 (20 images across 10 scenario types)
// Labeling guide:         src/app/api/extract/__tests__/fixtures/README.md
// Code-based dimensions:  D3 (orthographic faithfulness), D4 (verbatim surface form), D5a (no-words)
// Manual rubric dims:     D1 (target-language purity), D2 (word identity/noise), D5b (yield density)
const RUN_EVALS = process.env.RUN_EXTRACTION_EVALS === "true";

// ─── Type definitions ────────────────────────────────────────────────────────

interface LabelEntry {
  targetLanguage: string;
  expectedWords: string[];
}

type ReferenceLabels = Record<string, LabelEntry>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an image file to a base64 data-URL suitable for the extract API body.
 * Supports .jpg/.jpeg, .png, .webp.
 */
function imageToDataUrl(
  filePath: string,
): { image: string; mimeType: string } {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const mimeType = mimeMap[ext];
  if (!mimeType) {
    throw new Error(
      `Unsupported fixture extension: .${ext} (supported: jpg, jpeg, png, webp)`,
    );
  }
  const bytes = readFileSync(filePath);
  const b64 = bytes.toString("base64");
  return { image: `data:${mimeType};base64,${b64}`, mimeType };
}

/**
 * Call the real /api/extract route handler directly (no HTTP, same process).
 * Returns parsed { words, detectedLanguage? } or throws on non-2xx.
 */
async function callExtractRoute(
  image: string,
  mimeType: string,
  targetLanguage: string,
  deckId = "eval-deck-id",
): Promise<{ words: string[]; detectedLanguage?: string }> {
  // Dynamic import avoids module-level env/auth mock conflicts with unit tests.
  // The route handler reads ANTHROPIC_API_KEY from process.env at call time.
  const { POST } = await import("@/app/api/extract/route");

  // Build a minimal authenticated-looking Request. The eval route is protected
  // by auth.api.getSession — in eval mode we need a real session or we must
  // bypass auth. Bypass: set a mock session by overriding the auth module before
  // import, or accept the 401 and note that ANTHROPIC_API_KEY + a real session
  // cookie are required for the full live eval.
  //
  // For a proper live eval run: start the Next.js dev server and POST via fetch,
  // or configure a real test session. The assertions below will catch a 401 and
  // fail the test with a clear message.
  const req = new Request("http://localhost:3000/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mimeType, deckId, targetLanguage }),
  });

  const response = await POST(req);
  const json = (await response.json()) as {
    words?: string[];
    detectedLanguage?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      `Extract route returned ${response.status}: ${json.error ?? "(no error message)"}. ` +
        `If status is 401, ensure a real session is present in the eval environment.`,
    );
  }

  return {
    words: json.words ?? [],
    detectedLanguage: json.detectedLanguage,
  };
}

// ─── Eval suite ──────────────────────────────────────────────────────────────

describe.skipIf(!RUN_EVALS)("Extraction eval — reference dataset", () => {
  // No vi.mock — eval tests hit the real Anthropic API
  // ANTHROPIC_API_KEY must be set in the environment

  const fixturesDir = join(__dirname, "fixtures");
  const labelsPath = join(__dirname, "reference-labels.json");

  it("fixtures directory and reference-labels.json exist when evals are run", () => {
    const fixturesExist = existsSync(fixturesDir);
    const labelsExist = existsSync(labelsPath);

    if (!fixturesExist || !labelsExist) {
      // Wave 0 gap: fixtures and labels must be manually curated by Joshua
      // See fixtures/README.md for the 20 required scenario types and naming convention.
      console.warn(
        "[eval] WAVE 0 GAP: fixtures/ directory or reference-labels.json not found. " +
          "Manually author 20 reference images and reference-labels.json before running evals. " +
          `Expected fixtures at: ${fixturesDir}\nExpected labels at: ${labelsPath}`,
      );
      return;
    }

    const raw = JSON.parse(readFileSync(labelsPath, "utf-8")) as Record<
      string,
      unknown
    >;
    // Filter out meta-keys (_schema, _slots) used in the template
    const fixtureKeys = Object.keys(raw).filter(
      (k) => !k.startsWith("_"),
    );

    if (fixtureKeys.length < 20) {
      console.warn(
        `[eval] Only ${fixtureKeys.length} fixtures labeled — target is 20 minimum per AI-SPEC Section 5`,
      );
    }
    expect(fixtureKeys.length).toBeGreaterThanOrEqual(20);
  });

  it(
    "D5a — no-words correctness: blank/no-text images return empty word array",
    { timeout: 60_000 },
    async () => {
      expect(existsSync(fixturesDir)).toBe(true);
      expect(existsSync(labelsPath)).toBe(true);

      const labels = JSON.parse(
        readFileSync(labelsPath, "utf-8"),
      ) as ReferenceLabels;

      // Collect all entries with expectedWords: [] — these are the no-text fixtures
      const noTextEntries = Object.entries(labels).filter(
        ([key, entry]) =>
          !key.startsWith("_") && entry.expectedWords.length === 0,
      );

      expect(noTextEntries.length).toBeGreaterThanOrEqual(2); // spec requires images 18-19 minimum

      for (const [filename, entry] of noTextEntries) {
        const filePath = join(fixturesDir, filename);
        expect(existsSync(filePath)).toBe(true);

        const { image, mimeType } = imageToDataUrl(filePath);
        const result = await callExtractRoute(
          image,
          mimeType,
          entry.targetLanguage,
        );

        // D5a: no text in image → must return empty array (EXT-03)
        expect(result.words, `D5a FAIL for ${filename}: expected [] but got ${JSON.stringify(result.words)}`).toEqual([]);
      }
    },
  );

  it(
    "D3 + D4 — orthographic faithfulness + verbatim surface form: expected words present in output",
    { timeout: 300_000 },
    async () => {
      expect(existsSync(fixturesDir)).toBe(true);
      expect(existsSync(labelsPath)).toBe(true);

      const labels = JSON.parse(
        readFileSync(labelsPath, "utf-8"),
      ) as ReferenceLabels;

      // All labeled entries that have at least one expected word (skip no-text + meta keys)
      const textEntries = Object.entries(labels).filter(
        ([key, entry]) =>
          !key.startsWith("_") && entry.expectedWords.length > 0,
      );

      // Track failures for SUMMARY reporting — do NOT weaken assertions (T-10-15)
      const failures: Array<{
        fixture: string;
        missingWords: string[];
        returned: string[];
      }> = [];

      for (const [filename, entry] of textEntries) {
        const filePath = join(fixturesDir, filename);
        expect(existsSync(filePath)).toBe(true);

        const { image, mimeType } = imageToDataUrl(filePath);
        const result = await callExtractRoute(
          image,
          mimeType,
          entry.targetLanguage,
        );

        // D3/D4: every ground-truth word (exact string incl. diacritics) must be present
        // in the returned word list. This is a membership check — extra returned words are
        // the D2 dimension, scored by the tutor, NOT asserted here.
        const missing = entry.expectedWords.filter(
          (expected) => !result.words.includes(expected),
        );

        if (missing.length > 0) {
          failures.push({ fixture: filename, missingWords: missing, returned: result.words });
        }
      }

      if (failures.length > 0) {
        // Log detailed failure info for SUMMARY / prompt tuning — do NOT silently pass (T-10-15)
        console.error(
          "[eval] D3/D4 FAILURES — record in SUMMARY for prompt tuning:\n" +
            failures
              .map(
                (f) =>
                  `  ${f.fixture}:\n    missing: ${f.missingWords.join(", ")}\n    returned: ${f.returned.join(", ")}`,
              )
              .join("\n"),
        );
      }

      // Assert all expected words were found across all fixtures
      expect(
        failures,
        `D3/D4 failures in ${failures.length} fixture(s) — see console output above for details`,
      ).toHaveLength(0);
    },
  );

  // ── Manual rubric dimensions (D1, D2, D5b) — not asserted in code ──────────
  // These dimensions require FR/ES tutor judgment. Run the eval and inspect the
  // console output below to perform the manual rubric pass per 10-AI-SPEC Section 5.
  it(
    "D1 + D2 + D5b — manual rubric: log extraction outputs for tutor review",
    { timeout: 600_000 },
    async () => {
      expect(existsSync(fixturesDir)).toBe(true);
      expect(existsSync(labelsPath)).toBe(true);

      const labels = JSON.parse(
        readFileSync(labelsPath, "utf-8"),
      ) as ReferenceLabels;

      const allEntries = Object.entries(labels).filter(
        ([key]) => !key.startsWith("_"),
      );

      console.log("\n[eval] ── MANUAL RUBRIC OUTPUT (D1 / D2 / D5b) ──────────────────────");
      console.log(
        "For each fixture, inspect the returned words against the rubric in 10-AI-SPEC Section 1b:\n" +
          "  D1 (target-language purity): any non-target-language words?\n" +
          "  D2 (word identity / noise):  any prices, allergen codes, table numbers, QR fragments?\n" +
          "  D5b (yield density):         word count proportionate to visible vocabulary?\n",
      );

      for (const [filename, entry] of allEntries) {
        const filePath = join(fixturesDir, filename);
        if (!existsSync(filePath)) {
          console.log(`  [MISSING] ${filename} — skipped`);
          continue;
        }

        const { image, mimeType } = imageToDataUrl(filePath);
        let result: { words: string[]; detectedLanguage?: string };
        try {
          result = await callExtractRoute(image, mimeType, entry.targetLanguage);
        } catch (err) {
          console.log(`  [ERROR] ${filename}: ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }

        console.log(`  ${filename} (target: ${entry.targetLanguage})`);
        console.log(`    detectedLanguage: ${result.detectedLanguage ?? "(not returned)"}`);
        console.log(`    wordCount: ${result.words.length}`);
        console.log(`    words: ${result.words.join(", ")}`);
        console.log(
          `    [RUBRIC] D1 purity: ? | D2 noise: ? | D5b density: ?  ← tutor fills in`,
        );
      }

      console.log("[eval] ── END MANUAL RUBRIC OUTPUT ─────────────────────────────────────\n");

      // This test always passes — its purpose is logging, not assertion.
      // Record tutor rubric outcomes in 10-04-SUMMARY.md after the session.
      expect(true).toBe(true);
    },
  );
});

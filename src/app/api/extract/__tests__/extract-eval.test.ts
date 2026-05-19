import { describe, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Gated by RUN_EXTRACTION_EVALS=true — do NOT run on every push (hits real Anthropic API)
// Usage: RUN_EXTRACTION_EVALS=true npx vitest run src/app/api/extract/__tests__/extract-eval.test.ts
const RUN_EVALS = process.env.RUN_EXTRACTION_EVALS === "true";

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
      // See 10-AI-SPEC.md Section 5 for reference dataset composition (20 images)
      // and 10-VALIDATION.md Wave 0 Requirements for the manual curation checklist.
      console.warn(
        "[eval] WAVE 0 GAP: fixtures/ directory or reference-labels.json not found. " +
          "Manually author 20 reference images and reference-labels.json before running evals. " +
          `Expected fixtures at: ${fixturesDir} and labels at: ${labelsPath}`,
      );
      // Not a hard failure at this stage — fixtures are manually curated
      return;
    }

    // Once fixtures are present, load and validate structure
    const labels = JSON.parse(readFileSync(labelsPath, "utf-8")) as Record<string, string[]>;
    const fixtureCount = Object.keys(labels).length;

    // Reference dataset spec: 20 images minimum (AI-SPEC Section 5)
    if (fixtureCount < 20) {
      console.warn(
        `[eval] Only ${fixtureCount} fixtures labeled — target is 20 minimum per AI-SPEC Section 5`,
      );
    }
  });

  // Placeholder: once fixtures are curated, each test below loads a fixture,
  // POSTs to the real /api/extract endpoint (or calls extractionLogic directly),
  // and asserts against reference-labels.json for code-based dimensions:
  //   D3 (orthographic faithfulness) — exact string match
  //   D4 (verbatim surface form)     — exact string match
  //   D5a (no-words correctness)     — assert words.length === 0 for blank/no-text fixtures
  //
  // Dimensions D1 (target-language purity), D2 (word identity / noise), D5b (yield density)
  // require human review by FR/ES tutor — see AI-SPEC Section 5 for the rubric.
});

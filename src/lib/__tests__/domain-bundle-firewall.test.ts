// domain-bundle-firewall.test.ts — Phase 28.1 Plan 03, Task 3.
//
// Standing enforcement of the DR-02 export-map firewall that protects
// PERF-14 (Phase 27-07's client-bundle win from swapping every "use client"
// zod importer to zod/mini). @leocards/domain/schemas gained a REAL zod
// runtime dependency in this plan's Task 1 — before that, 28.1-01's
// "packages/domain has zero dependencies" check was itself sufficient
// enforcement. That check no longer applies (the package now legitimately
// depends on zod), so this test takes over as the guard: it asserts nothing
// a client bundle can reach ever pulls zod back in.
//
// Two independent assertions:
//   (a) no "use client" file under src/ imports @leocards/domain/schemas
//   (b) the root/study/habitat barrels (and the engine modules they
//       re-export) never reference the string "zod"
//
// Vitest runs in `environment: "node"` (no jsdom) for this file, so both
// checks are plain source-greps via node:fs — same technique already used
// by src/components/__tests__/habitat-scene-video.test.ts.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..", "..");

// Test files never ship to a client bundle, so they are out of scope for
// this firewall — excluding them also avoids this very file's own source
// (which necessarily contains both trigger substrings as string literals
// below) from tripping its own check.
function isTestFile(fileName: string): boolean {
  return /\.test\.tsx?$/.test(fileName);
}

function walkSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkSourceFiles(full, files);
    } else if (/\.tsx?$/.test(entry) && !isTestFile(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("domain bundle firewall (DR-02 / PERF-14)", () => {
  it('no "use client" file imports @leocards/domain/schemas', () => {
    const useClientDirective = '"use client"';
    const schemasSpecifier = "@leocards/domain/schemas";

    const offenders = walkSourceFiles(SRC_ROOT).filter((file) => {
      const content = readFileSync(file, "utf8");
      return (
        content.includes(useClientDirective) &&
        content.includes(schemasSpecifier)
      );
    });

    expect(
      offenders,
      "DR-02 / PERF-14 firewall violation: the file(s) below carry a " +
        '"use client" directive AND import @leocards/domain/schemas, which ' +
        "has a real zod runtime dependency (added in Phase 28.1 Plan 03 " +
        "Task 1). Shipping zod to a client bundle undoes PERF-14's bundle " +
        "win (Phase 27-07's zod/mini conversion). Move this import behind a " +
        "server boundary, or validate with a client-local zod/mini schema " +
        `instead:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the root, study and habitat barrels never reference zod", () => {
    const domainSrc = join(SRC_ROOT, "..", "packages", "domain", "src");
    const guardedFiles = [
      join(domainSrc, "index.ts"),
      join(domainSrc, "study", "index.ts"),
      join(domainSrc, "habitat", "index.ts"),
      join(domainSrc, "study", "study-engine.ts"),
      join(domainSrc, "habitat", "habitat-engine.ts"),
    ];

    const offenders = guardedFiles.filter((file) =>
      readFileSync(file, "utf8").includes("zod"),
    );

    expect(
      offenders,
      "DR-02 / PERF-14 firewall violation: the file(s) below reference " +
        '"zod" but must stay dependency-free — @leocards/domain\'s `.`, ' +
        "`./study` and `./habitat` subpaths are imported by both the web " +
        "app and (from Phase 28.3) native screens, and must never carry a " +
        `zod runtime dependency:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

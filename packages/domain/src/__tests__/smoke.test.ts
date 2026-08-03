// Workspace-resolution smoke test. Unlike every other test in this repo,
// this file MUST import BY PACKAGE NAME (`from "@leocards/domain"`), never
// by a `./`-relative path — its whole job is proving the npm workspaces
// symlink and vitest's module resolution work end to end. Do not "fix" this
// import to a relative path; that would defeat the point of the test.

import type { CardId } from "@leocards/domain";
import * as domain from "@leocards/domain";
import { describe, expect, it } from "vitest";

// A trivial identity helper typed with a branded ID — if `@leocards/domain`'s
// type export didn't resolve at compile time, this file would fail
// `isolatedModules` typechecking before the test even runs.
function identity(id: CardId): CardId {
  return id;
}

describe("@leocards/domain workspace resolution", () => {
  it("resolves a branded ID type import and round-trips a value through it", () => {
    const id = "abc" as CardId;
    expect(identity(id)).toBe(id);
  });

  it("resolves a real module via a namespace import by package name", () => {
    // Proves the resolver returned an actual module object (not undefined,
    // not a throw) when imported by package name rather than relative path.
    expect(domain).toBeDefined();
    expect(typeof domain).toBe("object");
  });
});

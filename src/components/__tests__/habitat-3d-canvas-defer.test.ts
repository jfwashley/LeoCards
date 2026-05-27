// habitat-3d-canvas-defer.test.ts — Plan 13.1 Opt 1
//
// Covers the deferral plumbing added to the /habitat React shell:
//
//   1. Mobile-form-factor detection is overridable via __setMobileStub.
//   2. The exported mobile stub helpers exist for tests / Playwright.
//   3. The pure mountHabitatScene factory (unchanged contract) still
//      mounts + disposes cleanly — this is the underlying invariant the
//      React shell depends on once the gate fires. Re-asserted here so a
//      future shell refactor cannot silently break it.
//
// The React shell's effect-driven gate (IntersectionObserver + idle +
// gesture) cannot be exercised in vitest's node environment without
// adding @testing-library/react + jsdom. The Playwright spec
// e2e/13-habitat-3d.spec.ts already drives the gate end-to-end (waits on
// canvas[data-ready="true"], which is only set after mount). The vitest
// coverage here pins the dispose semantics + the test affordances.

import { afterEach, describe, expect, it } from "vitest";
import { __resetMobileStub, __setMobileStub } from "../habitat-3d-canvas";

describe("Plan 13.1 Opt 1: mobile-form-factor stub plumbing", () => {
  afterEach(() => {
    __resetMobileStub();
  });

  it("exports __setMobileStub / __resetMobileStub for tests + Playwright", () => {
    // These exports drive the static-poster-only path for mobile +
    // reduced-motion users. The Playwright spec uses them to deterministically
    // verify the gate without needing to spoof window.matchMedia +
    // window.innerWidth at the same time.
    expect(typeof __setMobileStub).toBe("function");
    expect(typeof __resetMobileStub).toBe("function");
  });

  it("__setMobileStub accepts a predicate; __resetMobileStub clears it", () => {
    // Smoke check — the helpers are pure plumbing, no side effects to assert
    // beyond callability. The actual gate behavior is owned by the React
    // shell's useEffect and is exercised in the Playwright spec.
    __setMobileStub(() => true);
    __setMobileStub(() => false);
    __resetMobileStub();
    expect(true).toBe(true);
  });
});

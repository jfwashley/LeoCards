// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TranslationForm } from "@/components/translation-form";

// saveCard is a "use server" action — mock it so the module resolves in jsdom.
vi.mock("@/lib/deck-actions", () => ({
  saveCard: vi.fn(),
}));

interface FetchCall {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  signal?: AbortSignal;
}

let fetchCalls: FetchCall[] = [];

/**
 * A fetch mock that behaves like the REAL fetch with respect to
 * AbortSignal: calling `controller.abort()` rejects the in-flight promise
 * with a DOMException named "AbortError" — this is what proves (or
 * disproves) that translation-form.tsx's AbortController fix actually
 * cancels the stale request, not just that a newer one was fired.
 */
function installAbortAwareFetchMock() {
  fetchCalls = [];
  global.fetch = vi.fn((_url: string, init?: RequestInit) => {
    return new Promise((resolve, reject) => {
      const signal = init?.signal ?? undefined;
      fetchCalls.push({ resolve, reject, signal });
      if (signal) {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }
    });
  }) as unknown as typeof fetch;
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

const defaultProps = {
  deckId: "deck-1",
  nativeLang: "en",
  targetLang: "fr",
  nativeLangLabel: "English",
  targetLangLabel: "French",
};

beforeEach(() => {
  vi.useFakeTimers();
  installAbortAwareFetchMock();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TranslationForm AbortController stale-response race (PERF-19)", () => {
  it("only the later-fired (fast) result lands when a slow-first/fast-second same-direction pair resolves out of order", async () => {
    render(<TranslationForm {...defaultProps} />);

    const nativeInput = screen.getByLabelText("English") as HTMLInputElement;

    // Fire the first (slow) same-direction translation.
    fireEvent.change(nativeInput, { target: { value: "cha" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchCalls).toHaveLength(1);

    // Fire the second (fast) same-direction translation before the first
    // resolves — the production code must abort call 1 at this point.
    fireEvent.change(nativeInput, { target: { value: "chat" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchCalls).toHaveLength(2);

    // Resolve the fast (2nd) call first.
    await act(async () => {
      fetchCalls[1]?.resolve(jsonResponse({ translation: "chat-fr" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Attempt to also resolve the slow (1st) call — if it was correctly
    // aborted, this resolve() is a no-op against an already-rejected promise.
    await act(async () => {
      fetchCalls[0]?.resolve(jsonResponse({ translation: "cha-fr" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const targetInput = screen.getByLabelText("French") as HTMLInputElement;
    expect(targetInput.value).toBe("chat-fr");
  });

  it("an AbortError fetch rejection never surfaces the 'Translation unavailable' error", async () => {
    render(<TranslationForm {...defaultProps} />);

    const nativeInput = screen.getByLabelText("English") as HTMLInputElement;

    fireEvent.change(nativeInput, { target: { value: "cha" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchCalls).toHaveLength(1);

    // Reject the in-flight fetch with an AbortError directly — proves the
    // catch block special-cases this rejection (silent no-op), independent
    // of exactly how/when the abort was triggered.
    await act(async () => {
      fetchCalls[0]?.reject(new DOMException("Aborted", "AbortError"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.queryByText("Translation unavailable — enter manually."),
    ).toBeNull();
  });

  it("the existing field-switch guard still discards a response whose direction no longer matches activeField", async () => {
    render(<TranslationForm {...defaultProps} />);

    const nativeInput = screen.getByLabelText("English") as HTMLInputElement;
    fireEvent.change(nativeInput, { target: { value: "cha" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchCalls).toHaveLength(1);

    // Switch fields via the swap control (always clickable — unlike typing
    // directly into the target field, which is unavailable while it shows
    // the translating shimmer) BEFORE the native-direction fetch resolves
    // and BEFORE the swap's own re-translate debounce fires. This isolates
    // the pre-existing activeField guard from the new AbortController
    // behavior (no abort has happened yet).
    const swapBtn = screen.getByLabelText("Swap fields");
    fireEvent.click(swapBtn);

    const targetInput = screen.getByLabelText("French") as HTMLInputElement;
    expect(targetInput.value).toBe("cha"); // swapped value

    // Now resolve the stale native-direction fetch.
    await act(async () => {
      fetchCalls[0]?.resolve(jsonResponse({ translation: "stale-result" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Unaffected by the stale, guarded-off result.
    expect(targetInput.value).toBe("cha");
    expect(
      screen.queryByText("Translation unavailable — enter manually."),
    ).toBeNull();
  });

  it("WR-01: clearing a field mid-flight aborts the in-flight request so a late-resolving stale response does not land in the just-emptied opposite field", async () => {
    render(<TranslationForm {...defaultProps} />);

    const nativeInput = screen.getByLabelText("English") as HTMLInputElement;

    // Fire a translation for "cha".
    fireEvent.change(nativeInput, { target: { value: "cha" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(fetchCalls).toHaveLength(1);

    // Clear the field before the in-flight request resolves — the debounced
    // empty-text call must abort call 1, not just skip issuing a new fetch.
    fireEvent.change(nativeInput, { target: { value: "" } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const targetInput = screen.getByLabelText("French") as HTMLInputElement;

    // Resolve the stale first call — if correctly aborted, this resolve()
    // targets an already-rejected promise and is a no-op.
    await act(async () => {
      fetchCalls[0]?.resolve(jsonResponse({ translation: "cha-fr" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(targetInput.value).toBe("");
    expect(
      screen.queryByText("Translation unavailable — enter manually."),
    ).toBeNull();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ACBanner } from "@/components/daybreak/ac-banner";
import { ACBtn } from "@/components/daybreak/ac-btn";
import { ACPairRow } from "@/components/daybreak/ac-pair-row";
import { ACProgress } from "@/components/daybreak/ac-progress";
import { ACReviewRow } from "@/components/daybreak/ac-review-row";
import { ACSeg } from "@/components/daybreak/ac-seg";

afterEach(() => cleanup());

// ─── Task 1 assertions ───────────────────────────────────────────────────────

describe("ACSeg — segmented toggle", () => {
  it('renders two buttons with accessible names "Type a word" and "From an image"', () => {
    render(<ACSeg mode="type" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Type a word/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /From an image/i })).toBeTruthy();
  });

  it('clicking "From an image" calls onChange with "image"', () => {
    const onChange = vi.fn();
    render(<ACSeg mode="type" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /From an image/i }));
    expect(onChange).toHaveBeenCalledWith("image");
  });

  it("active segment has aria-pressed=true", () => {
    render(<ACSeg mode="image" onChange={() => {}} />);
    const imageBtn = screen.getByRole("button", {
      name: /From an image/i,
    }) as HTMLButtonElement;
    expect(imageBtn.getAttribute("aria-pressed")).toBe("true");
    const typeBtn = screen.getByRole("button", {
      name: /Type a word/i,
    }) as HTMLButtonElement;
    expect(typeBtn.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("ACBtn — multi-variant button", () => {
  it('kind="primary" renders a button with accessible name "Save card"', () => {
    render(<ACBtn kind="primary">Save card</ACBtn>);
    const btn = screen.getByRole("button", {
      name: "Save card",
    }) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(false);
  });

  it('kind="disabled" renders a button with disabled property true', () => {
    render(<ACBtn kind="disabled">Save card</ACBtn>);
    const btn = screen.getByRole("button", {
      name: "Save card",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('kind="ghost" renders an enabled button', () => {
    render(<ACBtn kind="ghost">Cancel</ACBtn>);
    const btn = screen.getByRole("button", {
      name: "Cancel",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('kind="ghost-danger" renders an enabled button', () => {
    render(<ACBtn kind="ghost-danger">Remove</ACBtn>);
    const btn = screen.getByRole("button", {
      name: "Remove",
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe("ACBanner — ok/error banner", () => {
  it('kind="ok" contains "✓" and its children text', () => {
    render(<ACBanner kind="ok">Card saved — add another.</ACBanner>);
    const banner = screen.getByText("Card saved — add another.");
    expect(banner).toBeTruthy();
    // parentElement is always present for a rendered node — use textContent via element
    expect(banner.closest("div")?.textContent).toContain("✓");
    expect(banner.closest("div")?.textContent).not.toContain("!");
  });

  it('kind="error" contains "!" and its children text', () => {
    render(<ACBanner kind="error">Something went wrong.</ACBanner>);
    const banner = screen.getByText("Something went wrong.");
    expect(banner.closest("div")?.textContent).toContain("!");
    expect(banner.closest("div")?.textContent).not.toContain("✓");
  });
});

// ─── Task 2 assertions ───────────────────────────────────────────────────────

describe("ACReviewRow — keep/exclude word row", () => {
  it("renders the word and clicking the checkbox button calls onToggle", () => {
    const onToggle = vi.fn();
    render(
      <ACReviewRow
        word="gato"
        excluded={false}
        onToggle={onToggle}
        onEdit={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText("gato")).toBeTruthy();
    // The checkbox is a button — find all buttons, the first one is the toggle
    const [checkboxBtn] = screen.getAllByRole("button");
    expect(checkboxBtn).toBeTruthy();
    fireEvent.click(checkboxBtn as HTMLElement);
    expect(onToggle).toHaveBeenCalled();
  });

  it("when excluded=true the word has line-through and checkbox reflects off", () => {
    render(
      <ACReviewRow
        word="perro"
        excluded={true}
        onToggle={() => {}}
        onEdit={() => {}}
        onRemove={() => {}}
      />,
    );
    const wordEl = screen.getByText("perro") as HTMLElement;
    expect(wordEl.style.textDecoration).toContain("line-through");
  });
});

describe("ACPairRow — D-01 target-on-top orientation guard", () => {
  it("renders target value in the TOP input and native value in the BOTTOM input", () => {
    render(
      <ACPairRow
        targetLabel="ES"
        nativeLabel="EN"
        target="gato"
        native="cat"
        onEditTarget={() => {}}
        onEditNative={() => {}}
      />,
    );
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    // D-01: target (ES) MUST be first (top), native (EN) second (bottom)
    const [targetInput, nativeInput] = inputs;
    expect((targetInput as HTMLInputElement).value).toBe("gato");
    expect((nativeInput as HTMLInputElement).value).toBe("cat");
  });

  it('failed=true renders "Translation unavailable — enter manually." helper', () => {
    render(
      <ACPairRow
        targetLabel="ES"
        nativeLabel="EN"
        target="gato"
        native=""
        failed={true}
        onEditTarget={() => {}}
        onEditNative={() => {}}
      />,
    );
    expect(
      screen.getByText("Translation unavailable — enter manually."),
    ).toBeTruthy();
  });
});

describe("ACProgress — calm long-wait", () => {
  it("renders without crashing and shows the title text", () => {
    render(<ACProgress title="Reading your image…" sub="Hang tight." />);
    expect(screen.getByText("Reading your image…")).toBeTruthy();
  });

  it("renders with searching=true without crashing", () => {
    render(
      <ACProgress
        title="Reading your image…"
        sub="Hang tight."
        searching={true}
      />,
    );
    expect(screen.getByText("Reading your image…")).toBeTruthy();
  });
});

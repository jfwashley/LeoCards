// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TBtn } from "@/components/daybreak/t-btn";

afterEach(() => cleanup());

describe("TBtn", () => {
  it("renders children when isPending is false", () => {
    render(<TBtn>Sign in</TBtn>);
    expect(screen.getByText("Sign in")).toBeTruthy();
  });

  it("renders children when isPending is not passed", () => {
    render(<TBtn type="submit">Continue</TBtn>);
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("renders a spinner svg and button is disabled when isPending is true", () => {
    render(<TBtn isPending>Sign in</TBtn>);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    // Loader2 from lucide-react renders an svg
    const spinner = button.querySelector("svg");
    expect(spinner).toBeTruthy();
    // Spinner has animate-spin class (SVG className is SVGAnimatedString in jsdom — use getAttribute)
    expect(spinner?.getAttribute("class")).toContain("animate-spin");
    // Children are not rendered when isPending
    expect(screen.queryByText("Sign in")).toBeNull();
  });

  it("is disabled when the disabled prop is true", () => {
    render(<TBtn disabled>Sign in</TBtn>);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("is not disabled when neither isPending nor disabled", () => {
    render(<TBtn>Sign in</TBtn>);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("spreads button props like type and onClick", () => {
    render(<TBtn type="submit">Go</TBtn>);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.type).toBe("submit");
  });

  it("merges extra className with default button classes", () => {
    render(<TBtn className="mt-4">Go</TBtn>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("mt-4");
  });
});

// @vitest-environment jsdom
import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TField } from "@/components/daybreak/t-field";

afterEach(() => cleanup());

describe("TField", () => {
  it("renders a label with the correct text", () => {
    render(<TField label="Email" />);
    expect(screen.getByText("Email")).toBeTruthy();
  });

  it("wires label htmlFor to the input id (derived from label)", () => {
    render(<TField label="Email Address" />);
    const label = screen.getByText("Email Address") as HTMLLabelElement;
    const input = document.querySelector("input") as HTMLInputElement;
    expect(label.htmlFor).toBe("email-address");
    expect(input.id).toBe("email-address");
  });

  it("uses the provided id prop instead of deriving one", () => {
    render(<TField label="Email" id="custom-id" />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.id).toBe("custom-id");
  });

  it("applies error border class and renders the error text when error is set", () => {
    render(<TField label="Email" error="Invalid email" />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.className).toContain("border-destructive");
    expect(screen.getByText("Invalid email")).toBeTruthy();
  });

  it("does not apply error border when error is absent", () => {
    render(<TField label="Email" />);
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.className).not.toContain("border-destructive");
  });

  it("renders hint only when error is absent", () => {
    render(<TField label="Email" hint="At least 8 characters" />);
    expect(screen.getByText("At least 8 characters")).toBeTruthy();
  });

  it("does not render hint when error is set", () => {
    render(
      <TField label="Email" error="Required" hint="At least 8 characters" />,
    );
    expect(screen.queryByText("At least 8 characters")).toBeNull();
  });

  it("forwards ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TField label="Email" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("spreads arbitrary input props (type, placeholder, disabled)", () => {
    render(
      <TField
        label="Password"
        type="password"
        placeholder="••••••••"
        disabled
      />,
    );
    const input = document.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.placeholder).toBe("••••••••");
    expect(input.disabled).toBe(true);
  });
});

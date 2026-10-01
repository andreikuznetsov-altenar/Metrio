import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("marks error state", () => {
    render(<Input label="Email" error aria-label="Email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("disables input", () => {
    render(<Input label="Token" disabled />);
    expect(screen.getByLabelText("Token")).toBeDisabled();
  });
});

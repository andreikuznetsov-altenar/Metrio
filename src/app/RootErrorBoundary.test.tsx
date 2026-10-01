import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RootErrorBoundary } from "./RootErrorBoundary";

function Boom() {
  throw new Error("startup boom");
}

describe("RootErrorBoundary", () => {
  it("renders visible startup error when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    );
    expect(screen.getByTestId("startup-error-shell")).toBeInTheDocument();
    expect(screen.getByText(/couldn't start/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

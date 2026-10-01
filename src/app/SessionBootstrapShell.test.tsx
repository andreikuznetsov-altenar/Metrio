import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionBootstrapShell } from "./SessionBootstrapShell";

describe("SessionBootstrapShell", () => {
  it("renders visible boot content", () => {
    render(<SessionBootstrapShell />);
    expect(screen.getByTestId("session-bootstrapping")).toBeInTheDocument();
    expect(screen.getByText(/metrio/i)).toBeInTheDocument();
    expect(screen.getByText(/loading your session/i)).toBeInTheDocument();
  });
});

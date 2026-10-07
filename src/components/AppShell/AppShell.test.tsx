import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";
import { ThemeProvider } from "../../theme/ThemeProvider";

describe("AppShell", () => {
  it("renders fixed layout regions", () => {
    render(
      <ThemeProvider>
        <AppShell header={<div>Header</div>} footer={<div>Footer</div>}>
          <div>Content</div>
        </AppShell>
      </ThemeProvider>,
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("app-refresh-status-layer")).toBeInTheDocument();
  });
});

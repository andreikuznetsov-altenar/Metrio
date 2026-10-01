import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthenticatedApp } from "./app/AuthenticatedApp";
import { CurrentUserProvider } from "./app/CurrentUserContext";
import { ThemeProvider } from "./theme/ThemeProvider";

import { ConnectionProvider } from "./app/ConnectionContext";

vi.mock("./app/connectionStorage", () => ({
  isAppConnected: () => true,
}));

vi.mock("./platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({
    setup: { completed: true },
    teamDetection: null,
  })),
}));

describe("authenticated application", () => {
  it("renders a non-empty shell for signed-in users", async () => {
    render(
      <ThemeProvider>
        <CurrentUserProvider>
          <ConnectionProvider>
            <AuthenticatedApp />
          </ConnectionProvider>
        </CurrentUserProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByTestId("authenticated-app")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /performance/i })).toBeInTheDocument();
  });
});

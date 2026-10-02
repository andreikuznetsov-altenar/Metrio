import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MetrioAppHeader } from "./MetrioAppHeader";
import { CurrentUserProvider } from "../app/CurrentUserContext";
import { ThemeProvider } from "../theme/ThemeProvider";

function renderHeader(feedbackEnabled: boolean) {
  return render(
    <ThemeProvider>
      <CurrentUserProvider>
        <MetrioAppHeader
          activeRoute="performance"
          feedbackEnabled={feedbackEnabled}
          onNavigate={() => undefined}
        />
      </CurrentUserProvider>
    </ThemeProvider>,
  );
}

describe("MetrioAppHeader", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows Feedback when the module is enabled", () => {
    renderHeader(true);
    expect(screen.getByRole("button", { name: "Feedback" })).toBeInTheDocument();
  });

  it("marks no main nav item active when activeRoute is null", () => {
    render(
      <ThemeProvider>
        <CurrentUserProvider>
          <MetrioAppHeader
            activeRoute={null}
            feedbackEnabled
            onNavigate={() => undefined}
          />
        </CurrentUserProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Performance" })).not.toHaveClass(
      "is-active",
    );
    expect(screen.getByRole("button", { name: "Feedback" })).not.toHaveClass(
      "is-active",
    );
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("labels main nav Home route as Dashboard", () => {
    renderHeader(true);
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("disables Performance navigation until reporting data is ready", () => {
    const onNavigate = vi.fn();
    render(
      <ThemeProvider>
        <CurrentUserProvider>
          <MetrioAppHeader
            activeRoute="home"
            performanceEnabled={false}
            feedbackEnabled={false}
            onNavigate={onNavigate}
          />
        </CurrentUserProvider>
      </ThemeProvider>,
    );
    const performance = screen.getByRole("button", { name: "Performance" });
    expect(performance).toBeDisabled();
    fireEvent.click(performance);
    expect(onNavigate).not.toHaveBeenCalled();
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

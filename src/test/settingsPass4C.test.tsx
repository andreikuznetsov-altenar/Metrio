import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ProfileMenu } from "../shell/ProfileMenu";
import { ToastProvider, useToast } from "../components/Toast/ToastContext";
import { useEffect } from "react";
import { PreferencesSettingsPanel } from "../pages/settings/PreferencesSettingsPanel";
import { DEFAULT_PREFERENCES } from "../platform/preferences";

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: {
      person: { id: "p1", name: "Andrei Kuznetsov", role: "lead" },
      team: null,
    },
    devFixtureId: "lead",
    setDevFixture: vi.fn(),
    isDevFixtureMode: false,
  }),
}));

describe("settings pass 4C", () => {
  it("shows theme control in profile menu", () => {
    render(
      <ThemeProvider>
        <ProfileMenu />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /open profile menu/i }));
    expect(screen.getByTestId("profile-menu-theme")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
  });

  it("does not render theme picker in preferences settings", () => {
    render(
      <ToastProvider>
        <PreferencesSettingsPanel
          prefs={DEFAULT_PREFERENCES}
          onPersist={async () => undefined}
        />
      </ToastProvider>,
    );
    expect(screen.queryByLabelText("Theme preference")).not.toBeInTheDocument();
    expect(screen.getByTestId("preferences-settings")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Briefs")).toBeInTheDocument();
  });
});

function ToastSpammer() {
  const toast = useToast();
  useEffect(() => {
    toast.success("First");
    toast.error("Second");
    toast.info("Third");
  }, [toast]);
  return null;
}

describe("toast single visible", () => {
  it("replaces prior toast when a new one is shown", () => {
    render(
      <ToastProvider>
        <ToastSpammer />
      </ToastProvider>,
    );
    expect(screen.getByText("Third")).toBeInTheDocument();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.queryByText("Second")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});

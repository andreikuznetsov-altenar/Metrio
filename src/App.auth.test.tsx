import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { AuthenticatedApp } from "./app/AuthenticatedApp";
import * as CurrentUserContext from "./app/CurrentUserContext";
import { getFixtureUser } from "./fixtures/currentUsers";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ConnectionProvider } from "./app/ConnectionContext";
import { ToastProvider } from "./components/Toast/ToastContext";

vi.mock("./app/connectionStorage", () => ({
  isAppConnected: () => true,
  clearConnection: vi.fn(async () => undefined),
}));

function renderAuthenticatedApp() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <ConnectionProvider>
          <AuthenticatedApp />
        </ConnectionProvider>
      </ToastProvider>
    </ThemeProvider>,
  );
}

function mockCurrentUser(
  overrides: Partial<ReturnType<typeof CurrentUserContext.useCurrentUser>>,
) {
  const initializeWorkspace = vi.fn(async () => undefined);
  vi.spyOn(CurrentUserContext, "useCurrentUser").mockReturnValue({
    currentUser: getFixtureUser("employee"),
    devFixtureId: "employee",
    setDevFixture: vi.fn(),
    isDevFixtureMode: true,
    workspaceStatus: "ready",
    workspaceError: null,
    initializeWorkspace,
    ...overrides,
  });
  return { initializeWorkspace };
}

describe("authenticated application", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it(
    "renders Performance UI after workspace is ready",
    async () => {
    mockCurrentUser({ workspaceStatus: "ready" });

    renderAuthenticatedApp();

    const viewport = await screen.findByTestId("authenticated-app");
    expect(viewport).toHaveClass("authenticated-app");
    expect(viewport).toHaveAttribute("data-authenticated-viewport", "true");
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    const shell = screen.getByTestId("app-shell");
    const performanceNavTargets = [
      ...within(shell).queryAllByRole("button", { name: /performance/i }),
      ...within(shell).queryAllByRole("link", { name: /performance/i }),
    ];
    expect(performanceNavTargets.length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Metrio$/)).not.toBeInTheDocument();
  },
    15_000,
  );

  it("shows initialization shell instead of an empty viewport", () => {
    const { initializeWorkspace } = mockCurrentUser({
      workspaceStatus: "initializing",
    });

    renderAuthenticatedApp();

    const viewport = screen.getByTestId("authenticated-app");
    expect(within(viewport).getByTestId("workspace-initializing")).toBeInTheDocument();
    expect(within(viewport).getByText(/loading your workspace/i)).toBeInTheDocument();
    expect(within(viewport).getByTestId("app-shell")).toBeInTheDocument();
    expect(initializeWorkspace).not.toHaveBeenCalled();
  });

  it("shows recoverable error UI when workspace initialization fails", () => {
    mockCurrentUser({ workspaceStatus: "error", workspaceError: "Couldn't load your workspace." });

    renderAuthenticatedApp();

    const viewport = screen.getByTestId("authenticated-app");
    const errorPanel = within(viewport).getByTestId("workspace-init-error");
    expect(errorPanel).toBeInTheDocument();
    expect(within(errorPanel).getByRole("heading", { name: /couldn't load your workspace/i })).toBeInTheDocument();
    expect(within(viewport).getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(within(viewport).getByRole("button", { name: /reconnect/i })).toBeInTheDocument();
    expect(within(viewport).getByTestId("app-shell")).toBeInTheDocument();
  });

  it("starts workspace initialization from idle", () => {
    const { initializeWorkspace } = mockCurrentUser({ workspaceStatus: "idle" });

    renderAuthenticatedApp();

    expect(initializeWorkspace).toHaveBeenCalled();
    const viewport = screen.getByTestId("authenticated-app");
    expect(within(viewport).getByTestId("workspace-initializing")).toBeInTheDocument();
  });
});

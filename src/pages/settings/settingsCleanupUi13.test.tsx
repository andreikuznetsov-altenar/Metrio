import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/Toast/ToastContext";
import { DEFAULT_PREFERENCES, type AppPreferences } from "../../platform/preferences";
import { buildOrgRoleTeamDetection } from "../../fixtures/orgRoleProductionPathFixture";
import { CompanyAppSettingsPanel } from "./CompanyAppSettingsPanel";
import { AboutSettingsPanel } from "./AboutSettingsPanel";
import { UpdateProvider } from "../../app/UpdateContext";

vi.mock("./CompanySettingsPanel", () => ({
  CompanySettingsPanel: () => <div data-testid="company-settings-stub" />,
}));

vi.mock("./AboutSettingsPanel", () => ({
  AboutSettingsPanel: () => <div data-testid="about-settings-stub" />,
}));

const invokeMock = vi.fn(async () => undefined);
const isEnabledMock = vi.fn(async () => false);
const applyLaunchAtLoginMock = vi.fn(async () => undefined);

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("../../platform/autostart", () => ({
  applyLaunchAtLogin: (...args: unknown[]) => applyLaunchAtLoginMock(...args),
  isLaunchAtLoginEnabled: (...args: unknown[]) => isEnabledMock(...args),
}));

vi.mock("../../app/CurrentUserContext", () => ({
  useCurrentUser: () => ({
    currentUser: {
      person: { id: "person-sam", name: "Sam Lead", role: "lead" },
      jobTitle: "Lead A",
      orgRole: "leaf_manager",
    },
    devFixtureId: null,
    setDevFixture: vi.fn(),
    isDevFixtureMode: false,
  }),
}));

vi.mock("../../app/PerformanceDataContext", () => ({
  usePerformanceData: () => ({ data: null }),
}));

vi.mock("../../app/feedbackSurveyStore", () => ({
  useFeedbackSurveyStore: (selector: (s: { data: null }) => unknown) =>
    selector({ data: null }),
}));

function renderCompanySettings(prefs: AppPreferences, onPersist = vi.fn(async () => undefined)) {
  return render(
    <ToastProvider>
      <CompanyAppSettingsPanel prefs={prefs} onPersist={onPersist} />
    </ToastProvider>,
  );
}

describe("UI13 settings cleanup", () => {
  afterEach(() => {
    cleanup();
    invokeMock.mockClear();
    isEnabledMock.mockReset();
    isEnabledMock.mockResolvedValue(false);
    applyLaunchAtLoginMock.mockClear();
  });

  it("does not render debug logging, system health, or workflow capacity audit", () => {
    renderCompanySettings(DEFAULT_PREFERENCES);
    expect(screen.queryByLabelText("Debug logging")).toBeNull();
    expect(screen.queryByText(/System health/i)).toBeNull();
    expect(screen.queryByText(/Workflow capacity audit/i)).toBeNull();
    expect(screen.queryByText(/Diagnostics/i)).toBeNull();
    expect(screen.queryByText("Support")).toBeNull();
    expect(screen.queryByText(/Run connection checks/i)).toBeNull();
    expect(screen.queryByText(/Export support bundle/i)).toBeNull();
    expect(screen.queryByTestId("diagnostics-support-settings")).toBeNull();
  });

  it("renders desktop switches and wires menu bar mode", async () => {
    const onPersist = vi.fn(async () => undefined);
    renderCompanySettings(
      {
        ...DEFAULT_PREFERENCES,
        general: { ...DEFAULT_PREFERENCES.general, keepRunningInTray: false },
      },
      onPersist,
    );
    const menuBar = screen.getByRole("switch", { name: "Menu bar mode" });
    const launch = screen.getByRole("switch", { name: "Launch at login" });
    expect(menuBar).toBeInTheDocument();
    expect(launch).toBeInTheDocument();
    fireEvent.click(menuBar);
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("set_keep_running_in_tray", { enabled: true });
      expect(onPersist).toHaveBeenCalled();
    });
  });

  it("calls launch at login integration when toggled", async () => {
    const onPersist = vi.fn(async () => undefined);
    renderCompanySettings(DEFAULT_PREFERENCES, onPersist);
    fireEvent.click(screen.getByRole("switch", { name: "Launch at login" }));
    await waitFor(() => {
      expect(applyLaunchAtLoginMock).toHaveBeenCalledWith(true);
      expect(onPersist).toHaveBeenCalled();
    });
  });

  it("shows organization identity from team detection", () => {
    const teamDetection = buildOrgRoleTeamDetection("leaf");
    renderCompanySettings({
      ...DEFAULT_PREFERENCES,
      teamDetection,
    });
    expect(screen.getByTestId("organization-identity-settings")).toBeInTheDocument();
    expect(screen.getByText("Sam Lead")).toBeInTheDocument();
    expect(screen.getByText("Lead A", { selector: ".settings-identity-block__subtitle" })).toBeInTheDocument();
    expect(screen.getByText(/Team lead workspace/i)).toBeInTheDocument();
  });

  it("shows manager contact when supervisor is in roster", () => {
    const teamDetection = buildOrgRoleTeamDetection("ic");
    renderCompanySettings({
      ...DEFAULT_PREFERENCES,
      teamDetection,
    });
    expect(screen.getByText("person-sam")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /person-sam@fixture\.test/i })).toBeInTheDocument();
  });

  it("renders caches card without support tools", () => {
    renderCompanySettings(DEFAULT_PREFERENCES);
    expect(screen.getByTestId("settings-cache-clear")).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: /Clear temporary caches/i });
    expect(clearBtn).toBeInTheDocument();
    expect(clearBtn).toHaveClass("btn");
    expect(getComputedStyle(clearBtn).width).not.toBe("100%");
  });

  it("hides review-build updater copy in about", () => {
    render(
      <UpdateProvider>
        <AboutSettingsPanel embedded />
      </UpdateProvider>,
    );
    expect(screen.queryByTestId("about-update-status")).toBeNull();
    expect(screen.queryByText(/Updates are unavailable in this review build/i)).toBeNull();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonDetailDrawer } from "../pages/performance/PersonDetailDrawer";
import type { PersonAnalyticsWorkspace } from "../domain/analytics/personAnalyticsWorkspace";

vi.mock("../app/PerformanceDataContext", () => ({
  usePerformanceData: vi.fn(),
}));

vi.mock("../app/CurrentUserContext", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("../app/performanceAnalyticsContext", () => ({
  useOptionalPerformanceAnalytics: vi.fn(() => null),
  dispatchOpenPersonBrief: vi.fn(),
}));

vi.mock("../hooks/useOnboardingResources", () => ({
  useOnboardingResources: vi.fn(() => ({ matched: null, resources: [] })),
}));

vi.mock("../platform/preferences", () => ({
  loadPreferences: vi.fn(async () => ({})),
}));

vi.mock("../pages/performance/PersonBriefDrawer", () => ({
  PersonBriefDrawerPanel: () => (
    <div data-testid="person-brief-panel-stub">Brief content</div>
  ),
}));

import { usePerformanceData } from "../app/PerformanceDataContext";
import { useCurrentUser } from "../app/CurrentUserContext";

const mockUsePerformanceData = vi.mocked(usePerformanceData);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

const workspace: PersonAnalyticsWorkspace = {
  personId: "914",
  personName: "Sam Dev",
  role: "Engineer",
  availability: "Available",
  workload: "Normal",
  attention: [],
  performanceKpis: [],
  cycleTime: [],
  trends: [],
  contextLine: "Team context",
  activeWorkCount: 0,
  workRows: [],
  problematicWork: [],
  historyMonth: [],
  historyWeek: [],
  historyQuarter: [],
};

function stubContexts() {
  mockUsePerformanceData.mockReturnValue({
    viewModels: {
      getPerson: () => null,
      getPersonAnalytics: () => workspace,
    },
  } as ReturnType<typeof usePerformanceData>);
  mockUseCurrentUser.mockReturnValue({
    currentUser: {
      person: { id: "1114", name: "Lead", role: "lead" },
      team: { directReportIds: ["914", "915"] },
    },
  } as ReturnType<typeof useCurrentUser>);
}

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("PASS 14.12 unified person drawer", () => {
  afterEach(() => cleanup());

  it("A: opens on Profile by default", () => {
    stubContexts();
    render(<PersonDetailDrawer personId="914" open onClose={vi.fn()} />);
    expect(
      document.querySelector(
        '[data-person-drawer-view="profile"].person-drawer-view--active',
      ),
    ).toBeTruthy();
    expect(
      document.querySelector(
        '[data-person-drawer-view="brief"].person-drawer-view--active',
      ),
    ).toBeNull();
  });

  it("B/C/D: Profile↔Brief keeps the same drawer root mounted and phase", () => {
    stubContexts();
    const onViewChange = vi.fn();
    const { rerender } = render(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="profile"
        onViewChange={onViewChange}
        onClose={vi.fn()}
      />,
    );
    const root = screen.getByTestId("person-detail-drawer");
    const phase = root.getAttribute("data-drawer-phase");
    expect(root.getAttribute("data-drawer-panel")).toBe("primary");

    fireEvent.click(screen.getByRole("button", { name: "Brief" }));
    expect(onViewChange).toHaveBeenCalledWith("brief");

    rerender(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="brief"
        onViewChange={onViewChange}
        onClose={vi.fn()}
      />,
    );
    const afterBrief = screen.getByTestId("person-detail-drawer");
    expect(afterBrief).toBe(root);
    expect(afterBrief.getAttribute("data-drawer-phase")).toBe(phase);
    expect(afterBrief.getAttribute("data-drawer-panel")).toBe("primary");
    expect(
      document.querySelector(
        '[data-person-drawer-view="brief"].person-drawer-view--active',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("person-brief-drawer")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Profile" }));
    expect(onViewChange).toHaveBeenCalledWith("profile");
    rerender(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="profile"
        onViewChange={onViewChange}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("person-detail-drawer")).toBe(root);
    expect(
      document.querySelector(
        '[data-person-drawer-view="profile"].person-drawer-view--active',
      ),
    ).toBeTruthy();
  });

  it("E: Brief loading placeholder stays inside the same drawer", async () => {
    stubContexts();
    mockUsePerformanceData.mockReturnValue({
      viewModels: {
        getPerson: () => null,
        getPersonAnalytics: () => null,
      },
    } as ReturnType<typeof usePerformanceData>);

    render(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="brief"
        onViewChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const root = screen.getByTestId("person-detail-drawer");
    expect(root.textContent).toMatch(/Loading person/i);
    expect(root.getAttribute("data-drawer-panel")).toBe("primary");
  });

  it("F: opening another person defaults to Profile", () => {
    stubContexts();
    const { rerender } = render(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="brief"
        onViewChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      document.querySelector(
        '[data-person-drawer-view="brief"].person-drawer-view--active',
      ),
    ).toBeTruthy();

    rerender(
      <PersonDetailDrawer
        personId="915"
        open
        activeView="profile"
        onViewChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      document.querySelector(
        '[data-person-drawer-view="profile"].person-drawer-view--active',
      ),
    ).toBeTruthy();
  });

  it("G: explicit Brief opens the same drawer on Brief", () => {
    stubContexts();
    render(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="brief"
        onViewChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("person-detail-drawer")).toBeTruthy();
    expect(screen.getByTestId("person-brief-drawer")).toBeTruthy();
    expect(
      document.querySelector(
        '[data-person-drawer-view="brief"].person-drawer-view--active',
      ),
    ).toBeTruthy();
  });

  it("H: close from Brief closes the shared drawer", () => {
    stubContexts();
    const onClose = vi.fn();
    render(
      <PersonDetailDrawer
        personId="914"
        open
        activeView="brief"
        onViewChange={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(
      screen.getByTestId("person-detail-drawer").querySelector(
        ".drawer__header-toolbar .icon-btn",
      ) as HTMLButtonElement,
    );
    expect(onClose).toHaveBeenCalled();
  });
});

describe("PASS 14.12 scrollbar policy contracts", () => {
  it("defines primary visible and secondary hidden-thumb utilities", () => {
    const css = read("src/styles/ui-interaction-system.css");
    expect(css).toContain(".metrio-scroll--primary");
    expect(css).toContain(".metrio-scroll--hidden-thumb");
    expect(css).toMatch(
      /\.metrio-scroll--primary[\s\S]*scrollbar-width:\s*thin/,
    );
    expect(css).toMatch(
      /\.metrio-scroll--hidden-thumb[\s\S]*scrollbar-width:\s*none/,
    );
    expect(css).toMatch(
      /\.metrio-scroll--hidden-thumb::-webkit-scrollbar[\s\S]*width:\s*0/,
    );
    expect(css).not.toMatch(/scrollbar-gutter:\s*stable/);
  });

  it("primary main screens keep visible scrollbar class", () => {
    expect(read("src/app/AppLayout.tsx")).toContain("metrio-scroll--primary");
    expect(read("src/pages/feedback/design-system.tsx")).toContain(
      "metrio-scroll--primary",
    );
  });

  it("secondary surfaces use hidden-thumb scroll", () => {
    expect(read("src/components/Drawer/DrawerStack.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
    expect(read("src/components/Drawer/Drawer.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
    expect(read("src/components/Modal/Modal.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
    expect(read("src/shell/NotificationCenter.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
    expect(read("src/components/TaskListModal/TaskListModal.tsx")).toContain(
      "metrio-scroll--hidden-thumb",
    );
  });

  it("secondary scroll keeps client width stable when overflowing", () => {
    const el = document.createElement("div");
    el.className = "metrio-scroll metrio-scroll--hidden-thumb";
    el.style.width = "240px";
    el.style.height = "80px";
    el.style.overflowY = "auto";
    el.innerHTML = `<div style="height:400px;width:100%">tall</div>`;
    document.body.appendChild(el);
    const before = el.clientWidth;
    el.scrollTop = 120;
    expect(el.scrollTop).toBeGreaterThan(0);
    expect(el.clientWidth).toBe(before);
    document.body.removeChild(el);
  });
});

describe("PASS 14.12 control active-state parity", () => {
  it("Period/select and From/To date share one focus/open border contract", () => {
    const css = read("src/styles/ui-interaction-system.css");
    const block = css.match(
      /\.select-trigger:focus-visible,[\s\S]*?\.metrio-date-picker__input:focus-visible \{[\s\S]*?\}/,
    )?.[0];
    expect(block).toBeTruthy();
    expect(block).toContain('.select-trigger[data-state="open"]');
    expect(block).toContain('.metrio-date-picker__trigger[data-state="open"]');
    expect(block).toContain("border-color: var(--color-focus-border)");
    expect(block).toContain("outline: none");
    expect(block).toContain("box-shadow: none");
  });

  it("date picker trigger publishes data-state open while calendar is open", async () => {
    const { MetrioDatePicker } = await import(
      "../components/DatePicker/MetrioDatePicker"
    );
    render(
      <MetrioDatePicker
        label="From"
        value="2026-01-15"
        onChange={() => undefined}
      />,
    );
    const trigger = screen.getByRole("button", { name: /From date/i });
    expect(trigger.getAttribute("data-state")).toBe("closed");
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger.getAttribute("data-state")).toBe("open");
    });
  });
});

describe("PASS 14.12 architecture guards", () => {
  it("AppLayout no longer mounts a separate PersonBriefDrawer", () => {
    const source = read("src/app/AppLayout.tsx");
    expect(source).not.toContain("PersonBriefDrawer");
    expect(source).not.toContain("personBriefPersonId");
  });

  it("PersonDetailDrawer keeps a single primary panel for Profile and Brief", () => {
    const source = read("src/pages/performance/PersonDetailDrawer.tsx");
    expect(source).toContain('activePanel="primary"');
    expect(source).toContain("person-drawer-view-tabs");
    expect(source).toContain('data-person-drawer-view="brief"');
    expect(source).not.toContain('activePanel="secondary"');
  });
});

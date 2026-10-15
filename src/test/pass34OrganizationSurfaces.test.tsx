// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScopeStrip } from "../components/ScopeStrip/ScopeStrip";
import { DirectorSignalsView } from "../pages/performance/director/DirectorSignalsView";
import { DashboardRecommendations } from "../pages/home/dashboard/DashboardRecommendations";
import { LeadershipBranchesPerformanceView } from "../pages/performance/director/LeadershipBranchesPerformanceView";
import { buildLeadershipBranchMemberRows } from "../domain/organization/leadershipBranchMemberRows";
import type { LeadershipBranchPerformanceRow } from "../domain/organization/leadershipBranchPerformanceRows";
import type { ProductRecommendation } from "../domain/recommendations/buildProductRecommendations";
import type { Person } from "../domain/people/types";
import { testKpi, testWorkload } from "../domain/testFixtures";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
const recCss = read("src/pages/home/dashboard/executive-dashboard-pass10.css");
const perfCss = read("src/pages/performance/performance-dashboard.css");
const cockpitCss = read("src/pages/project/project-cockpit.css");

const rec = (id: string): ProductRecommendation => ({
  id,
  severity: "critical",
  title: `Elena Rossi needs delivery attention ${id}`,
  explanation: "6 delivery-risk items across the branch.",
  actionLabel: "Open Delivery Risk",
  actionKind: "open_performance",
  priority: 1,
});

describe("PASS34 single attention card (shared primitive, every scope)", () => {
  it("Director uses the recommendation primitive; Team Lead uses the single Recommended actions engine (no second recommendation surface)", () => {
    expect(read("src/pages/home/dashboard/DirectorExecutiveDashboard.tsx")).toContain("<DashboardRecommendations");
    const lead = read("src/pages/home/dashboard/ManagerExecutiveDashboard.tsx");
    expect(lead).toContain("<RecommendedActionsSection");
    // The card primitive appears only behind the Playwright visual seam, never in the production path.
    const seam = lead.indexOf("visualRecommendations ? (");
    expect(seam).toBeGreaterThan(-1);
    expect(lead.indexOf("<DashboardRecommendations")).toBeGreaterThan(seam);
    expect(lead.indexOf("<DashboardRecommendations")).toBeLessThan(lead.indexOf("<RecommendedActionsSection"));
  });

  it("one card => full-width single layout with CTA right + centred; 2+ => grid; >3 => carousel", () => {
    const one = render(<DashboardRecommendations items={[rec("a")]} onAction={vi.fn()} />);
    expect(one.container.querySelector(".executive-recommendations__list--single")).toBeTruthy();
    one.unmount();
    const two = render(<DashboardRecommendations items={[rec("a"), rec("b")]} onAction={vi.fn()} />);
    expect(two.container.querySelector(".executive-recommendations__list--single")).toBeNull();
    expect(two.container.querySelector(".executive-recommendations__list--carousel")).toBeNull();
    two.unmount();
    const many = render(
      <DashboardRecommendations items={["a", "b", "c", "d"].map(rec)} onAction={vi.fn()} />,
    );
    expect(many.container.querySelector(".executive-recommendations__list--carousel")).toBeTruthy();
    expect(recCss).toMatch(/--single \.executive-recommendations__item\s*\{[^}]*flex-direction:\s*row[^}]*align-items:\s*center[^}]*justify-content:\s*space-between/);
  });

  it("the plain item rule can never cap a card's width (regression: leaked 1/3 width)", () => {
    const itemRules = recCss.match(/(^|\n)\.executive-recommendations__item\s*\{[^}]*\}/g) ?? [];
    expect(itemRules.length).toBeGreaterThan(0);
    for (const rule of itemRules) expect(rule).not.toMatch(/max-width|flex:\s*0 0 calc|width:\s*calc/);
  });
});

describe("PASS34 carousel edge peek (shared primitive)", () => {
  it("two full cards + deliberate peeks, scroll-padding keeps the previous peek", () => {
    expect(recCss).toMatch(/--carousel-peek:\s*clamp\(/);
    expect(recCss).toMatch(/scroll-padding-inline-start:\s*calc\(var\(--carousel-bleed\) \+ var\(--carousel-peek-scroll\) \+ var\(--carousel-gap\)\)/);
    expect(recCss).toMatch(/--carousel \.executive-recommendations__item\s*\{[^}]*calc\(\(100% - 2 \* var\(--carousel-peek\) - 3 \* var\(--carousel-gap\)\) \/ 2\)/);
    expect(recCss).toMatch(/scroll-snap-align:\s*start/);
  });

  it("is full-bleed: the scroller extends through the page gutter (token) and keeps the content grid via symmetric padding", () => {
    expect(recCss).toMatch(/--carousel-bleed:[^;]*var\(--page-gutter-inline/);
    expect(recCss).toMatch(/margin-inline:\s*calc\(-1 \* var\(--carousel-bleed\)\)/);
    expect(recCss).toMatch(/padding-inline:\s*var\(--carousel-bleed\)/);
    expect(recCss).not.toMatch(/--carousel \{[^}]*max-width:\s*100%/);
  });
});

describe("PASS34 Signals share the PERFORMANCE SCOPE strip", () => {
  it("ScopeStrip renders the canonical strip classes", () => {
    const { container } = render(
      <ScopeStrip eyebrow="Performance scope" title="Organization scope · 34 people" action={<button>View all teams</button>} />,
    );
    const strip = container.querySelector("section")!;
    expect(strip.className).toContain("performance-scope-strip");
    expect(strip.querySelector(".performance-scope-strip__eyebrow")?.textContent).toBe("Performance scope");
    expect(within(strip).getByText("View all teams")).toBeTruthy();
  });

  it("each signal is a ScopeStrip (severity, title, context, Open) in a stacked strip list", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <DirectorSignalsView
        onOpen={onOpen}
        signals={
          [
            { id: "s1", severity: "warning", title: "Delivery risk concentration", description: "Andrei Kuznetsov · 6 tasks need attention", target: { kind: "overview" } },
          ] as never
        }
      />,
    );
    expect(container.querySelectorAll(".performance-scope-strip")).toHaveLength(1);
    expect(container.querySelector(".performance-scope-strip-list")).toBeTruthy();
    expect(screen.getByText("Delivery risk concentration")).toBeTruthy();
    expect(screen.getByText("Andrei Kuznetsov · 6 tasks need attention")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
  });

  it("the strip CSS lives with the component (one source), not duplicated in page CSS", () => {
    expect(read("src/components/ScopeStrip/ScopeStrip.css")).toMatch(/\.performance-scope-strip\s*\{/);
    expect(perfCss).not.toMatch(/\.performance-scope-strip\s*\{/);
    expect(read("src/pages/project/ProjectCockpitDrawer.tsx")).toContain("<ScopeStrip");
  });
});

describe("PASS34 project panel modules", () => {
  it("Summary is a bounded ScopeStrip; Delivery is one bounded module with row separators between rows only", () => {
    const drawer = read("src/pages/project/ProjectCockpitDrawer.tsx");
    expect(drawer).toMatch(/<ScopeStrip[\s\S]*eyebrow="Summary"/);
    expect(drawer).toContain('data-testid="project-cockpit-delivery"');
    expect(cockpitCss).toMatch(/project-cockpit-delivery"\]\s*\{[^}]*border:\s*1px solid[^}]*border-radius:\s*var\(--radius-card\)/);
    expect(cockpitCss).toMatch(/\.project-cockpit__metric-list li \+ li\s*\{[^}]*border-top:/);
    expect(cockpitCss).not.toMatch(/\.project-cockpit__metric-list li\s*\{[^}]*border-bottom/);
    expect(cockpitCss).toMatch(/\.project-cockpit__metric-list li\s*\{[^}]*justify-content:\s*space-between/);
  });
});

describe("PASS34 expandable hierarchy", () => {
  const person = (id: string, name: string, sup: string | undefined, title: string, withKpi: boolean): Person =>
    ({
      id,
      bamboo: { id, displayName: name, firstName: name, lastName: "", workEmail: `${id}@altenar.com`, jobTitle: title, supervisorId: sup, hireDate: "2024-01-01", status: "Active" },
      jira: null,
      identity: { matchedBy: "email", warnings: [] },
      availability: { state: "available", label: "Available", isHoliday: false },
      workload: testWorkload({ level: "normal", capacityLoadPercent: 60 }),
      personalWorkload: null,
      performance: withKpi ? testKpi({ completedCount: 10, firstPassAcceptedCount: 9, efficiencyIndex: 92 }) : null,
      issues: [],
      ownedIssues: [],
    }) as Person;
  const persons = [
    person("elena", "Elena Rossi", "sofia", "Design Manager", false),
    person("andrei", "Andrei Kuznetsov", "elena", "UX Team Lead", false),
    person("maya", "Maya Bennett", "andrei", "Senior Product Designer", true),
    person("daria", "Daria Petrova", "andrei", "Product Designer", true),
    person("marco", "Marco Bellini", "elena", "Casino Design Lead", false),
    person("chiara", "Chiara Romano", "marco", "Senior Product Designer", true),
  ];
  const params = { dateFrom: "2026-07-14", dateTo: "2026-10-14", targetReviewDays: 3, users: [], projects: [], teamScope: "full" } as never;
  const members = buildLeadershipBranchMemberRows({
    leaderId: "elena",
    descendantIds: persons.map((p) => p.id),
    persons,
    deliveryRisk: [],
    params,
  });

  it("a manager's children are their Team Leads; each lead's children are their own team only", () => {
    expect(members.map((m) => m.displayName)).toEqual(["Andrei Kuznetsov", "Marco Bellini"]);
    expect(members[0]!.children.map((c) => c.displayName)).toEqual(["Maya Bennett", "Daria Petrova"]);
    expect(members[1]!.children.map((c) => c.displayName)).toEqual(["Chiara Romano"]);
    expect(members[0]!.scopeLabel).toBe("3 people");
  });

  const row: LeadershipBranchPerformanceRow = {
    leaderId: "elena", leaderName: "Elena Rossi", leaderTitle: "Design Manager", peopleCount: 5,
    performanceLabel: "Healthy · 91% first pass", attentionLabel: "—", deliveryRiskCount: 0,
    capacityLabel: "—", capacityParts: [], capacityMeasuredLabel: "—", availabilityLabel: "—",
  };

  it("Director/Manager rows expand level by level with plus/minus and aria-expanded (same component)", async () => {
    render(
      <LeadershipBranchesPerformanceView
        rows={[row]}
        onSelectLeader={vi.fn()}
        onBack={vi.fn()}
        membersByLeaderId={{ elena: members }}
      />,
    );
    const top = screen.getByRole("button", { name: "Expand Elena Rossi's team" });
    expect(top.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Andrei Kuznetsov")).toBeNull();
    await userEvent.click(top);
    expect(screen.getByText("Andrei Kuznetsov")).toBeTruthy();
    expect(screen.queryByText("Maya Bennett")).toBeNull();
    const lead = screen.getByRole("button", { name: "Expand Andrei Kuznetsov's team" });
    await userEvent.click(lead);
    expect(screen.getByText("Maya Bennett")).toBeTruthy();
    expect(screen.queryByText("Chiara Romano")).toBeNull();
    expect(screen.getByRole("button", { name: "Collapse Andrei Kuznetsov's team" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("expanded rows have no left rail (indentation only)", () => {
    expect(perfCss).not.toMatch(/box-shadow:\s*inset 3px 0 0/);
    expect(perfCss).toMatch(/\.performance-branch-member-row__person\[data-depth="2"\]/);
  });
});

describe("PASS34 hierarchy table geometry", () => {
  it("leader column keeps the lion's share so indented names never wrap mid-word", () => {
    const view = read("src/pages/performance/director/LeadershipBranchesPerformanceView.tsx");
    const cols = [...view.matchAll(/<col style=\{\{ width: "([\d.]+)%" \}\} \/>/g)].map((m) => Number(m[1]));
    expect(cols[0]).toBeGreaterThanOrEqual(24);
    expect(cols.reduce((a, b) => a + b, 0)).toBe(100);
    expect(perfCss).toMatch(/performance-branch-member-row__person \.performance-branch-collapse__content\s*\{[^}]*var\(--space-3\)/);
  });
});

describe("PASS35 hierarchy fallback", () => {
  it("members without a resolvable supervisor attach to the branch leader instead of vanishing", () => {
    const mk = (id: string, sup?: string) =>
      ({
        id,
        bamboo: { id, displayName: id, firstName: id, lastName: "", workEmail: `${id}@altenar.com`, jobTitle: "Designer", supervisorId: sup, hireDate: "2024-01-01", status: "Active" },
        jira: null, identity: { matchedBy: "email", warnings: [] },
        availability: { state: "available", label: "Available", isHoliday: false },
        workload: testWorkload({ level: "normal", capacityLoadPercent: 50 }), personalWorkload: null,
        performance: testKpi({ completedCount: 5, firstPassAcceptedCount: 5, efficiencyIndex: 90 }), issues: [], ownedIssues: [],
      }) as Person;
    const rows = buildLeadershipBranchMemberRows({
      leaderId: "lead",
      descendantIds: ["lead", "a", "b"],
      persons: [mk("lead"), mk("a"), mk("b", "lead")],
      deliveryRisk: [],
      params: { dateFrom: "2026-07-14", dateTo: "2026-10-14", targetReviewDays: 3, users: [], projects: [], teamScope: "full" } as never,
    });
    expect(rows.map((r) => r.displayName).sort()).toEqual(["a", "b"]);
  });
});

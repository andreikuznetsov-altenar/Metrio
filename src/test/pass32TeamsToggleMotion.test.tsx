// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadershipBranchesPerformanceView } from "../pages/performance/director/LeadershipBranchesPerformanceView";
import type { LeadershipBranchPerformanceRow } from "../domain/organization/leadershipBranchPerformanceRows";
import type { LeadershipBranchMemberRow } from "../domain/organization/leadershipBranchMemberRows";

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");
const perfCss = read("../pages/performance/performance-dashboard.css");
const sysCss = read("../styles/ui-interaction-system.css");
const source = read("../pages/performance/director/LeadershipBranchesPerformanceView.tsx");

const lead = (id: string, name: string): LeadershipBranchPerformanceRow => ({
  leaderId: id,
  leaderName: name,
  leaderTitle: "Lead",
  peopleCount: 3,
  performanceLabel: "Healthy · 90% first pass",
  attentionLabel: "—",
  deliveryRiskCount: 0,
  capacityLabel: "2 Balanced",
  capacityParts: [{ label: "Balanced", value: 2 }],
  capacityMeasuredLabel: "2/2 measured",
  availabilityLabel: "—",
});
const member = (id: string, name: string): LeadershipBranchMemberRow => ({
  personId: id,
  displayName: name,
  jobTitle: "Product Designer",
  performanceLabel: "Healthy · 92% first pass",
  attentionLabel: "—",
  deliveryRiskCount: 0,
  capacityParts: [{ label: "Balanced", value: 1 }],
  availabilityLabel: "—",
});

function renderTeams() {
  return render(
    <LeadershipBranchesPerformanceView
      rows={[lead("l1", "Andrei Kuznetsov"), lead("l2", "Marco Bellini")]}
      onSelectLeader={vi.fn()}
      onBack={vi.fn()}
      membersByLeaderId={{
        l1: [member("m1", "Maya Bennett"), member("m2", "Daria Petrova")],
        l2: [member("m3", "Chiara Romano")],
      }}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe("PASS32 Teams plus/minus toggle", () => {
  it("uses real Plus/Minus icon components, no chevrons or text symbols", async () => {
    const { container } = renderTeams();
    expect(source).not.toMatch(/Chevron/);
    expect(source).toMatch(/import \{ Minus, Plus \} from "lucide-react"/);
    const toggles = screen.getAllByTestId("leadership-branch-toggle");
    expect(toggles).toHaveLength(2);
    for (const toggle of toggles) {
      expect(toggle.querySelector("svg[data-icon='plus']")).toBeTruthy();
      expect(toggle.querySelector("svg[data-icon='minus']")).toBeNull();
      expect(toggle.textContent?.trim()).toBe("");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    }
    expect(container.querySelector("[class*='chevron']")).toBeNull();
    await userEvent.click(toggles[0]!);
    const open = screen.getByRole("button", { name: "Collapse Andrei Kuznetsov's team" });
    expect(open.querySelector("svg[data-icon='minus']")).toBeTruthy();
    expect(open.querySelector("svg[data-icon='plus']")).toBeNull();
    expect(open.textContent?.trim()).toBe("");
    expect(open.getAttribute("aria-expanded")).toBe("true");
    // the other lead stays collapsed with a plus
    expect(
      screen.getByRole("button", { name: "Expand Marco Bellini's team" }).querySelector("svg[data-icon='plus']"),
    ).toBeTruthy();
  });

  it("same control geometry in both states (shared sized class, no per-state sizing)", () => {
    expect(perfCss).toMatch(/\.performance-branch-toggle\s*\{[^}]*width:\s*var\(--control-height-compact\)[^}]*height:\s*var\(--control-height-compact\)/);
    expect(perfCss).not.toMatch(/performance-branch-toggle[^{]*\[aria-expanded[^{]*\{[^}]*(width|height)/);
  });
});

describe("PASS32 Teams expansion motion", () => {
  it("opens (rows mount, then animate in) and closes (rows animate out, then unmount)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { container } = renderTeams();
      const toggle = screen.getByRole("button", { name: "Expand Andrei Kuznetsov's team" });
      await act(async () => toggle.click());
      // mounted collapsed first so the height transition can run
      expect(screen.getByText("Maya Bennett")).toBeTruthy();
      expect(container.querySelector(".performance-branch-collapse.is-open")).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(40);
      });
      expect(container.querySelectorAll(".performance-branch-collapse.is-open").length).toBeGreaterThan(0);

      await act(async () =>
        screen.getByRole("button", { name: "Collapse Andrei Kuznetsov's team" }).click(),
      );
      // closing: still mounted (animating) but no longer open
      expect(screen.getByText("Maya Bennett")).toBeTruthy();
      expect(container.querySelector(".performance-branch-collapse.is-open")).toBeNull();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(screen.queryByText("Maya Bennett")).toBeNull();
      expect(container.querySelectorAll("[data-testid='leadership-branch-member-row']")).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("two branches expand independently", async () => {
    renderTeams();
    await userEvent.click(screen.getByRole("button", { name: "Expand Andrei Kuznetsov's team" }));
    await userEvent.click(screen.getByRole("button", { name: "Expand Marco Bellini's team" }));
    expect(screen.getByText("Maya Bennett")).toBeTruthy();
    expect(screen.getByText("Chiara Romano")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Collapse Andrei Kuznetsov's team" }));
    await waitFor(() => expect(screen.queryByText("Maya Bennett")).toBeNull());
    expect(screen.getByText("Chiara Romano")).toBeTruthy();
  });

  it("reduced motion: rows appear open immediately and unmount without delay", async () => {
    (window as { matchMedia?: unknown }).matchMedia = (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    });
    const { container } = renderTeams();
    await userEvent.click(screen.getByRole("button", { name: "Expand Andrei Kuznetsov's team" }));
    expect(container.querySelectorAll(".performance-branch-collapse.is-open").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Collapse Andrei Kuznetsov's team" }));
    await waitFor(() => expect(screen.queryByText("Maya Bennett")).toBeNull(), { timeout: 100 });
  });

  it("CSS contract: canonical motion tokens, grid-rows height animation, reduced-motion token", () => {
    expect(perfCss).toMatch(/\.performance-branch-collapse\s*\{[^}]*grid-template-rows:\s*0fr[^}]*var\(--motion-standard\)[^}]*var\(--ease-exit\)/);
    expect(perfCss).toMatch(/\.performance-branch-collapse\.is-open\s*\{[^}]*grid-template-rows:\s*1fr[^}]*var\(--ease-enter\)/);
    expect(perfCss).not.toMatch(/performance-branch-[^{]*\{[^}]*display:\s*none/);
    const tokens = read("../styles/tokens.css");
    expect(tokens).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*--motion-standard:\s*0ms/);
  });
});

describe("PASS32 Canonical scrollbar CSS contract", () => {
  it("primary scroll owner reserves a stable lane and renders an exact 4px thumb", () => {
    expect(sysCss).toMatch(/\.metrio-scroll--primary\s*\{[^}]*overflow-y:\s*scroll/);
    const thumb = sysCss.match(/\.metrio-scroll--primary::-webkit-scrollbar-thumb\s*\{[^}]*\}/)![0];
    expect(thumb).toMatch(/border:\s*0 solid transparent/);
    expect(thumb).toMatch(/border-right-width:\s*var\(--metrio-scrollbar-inset, 4px\)/);
    expect(thumb).toMatch(/background-clip:\s*padding-box/);
    expect(sysCss).toMatch(/\.metrio-scroll--primary::-webkit-scrollbar\s*\{[^}]*width:\s*calc\(var\(--metrio-scrollbar-inset, 4px\) \+ var\(--metrio-scrollbar-size, 4px\)\)/);
    expect(sysCss).toMatch(/\.metrio-scroll--primary::-webkit-scrollbar-track,[\s\S]*?background:\s*transparent/);
    expect(sysCss).toMatch(/::-webkit-scrollbar-button\s*\{[^}]*display:\s*none/);
    const tokens = read("../styles/tokens.css");
    expect(tokens).toMatch(/--metrio-scrollbar-size:\s*4px/);
  });
});

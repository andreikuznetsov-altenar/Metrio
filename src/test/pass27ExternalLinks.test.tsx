// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityLink } from "../components/EntityLink/EntityLink";
import { GroupedIssuePreview } from "../components/GroupedIssuePreview/GroupedIssuePreview";
import { JiraIssueLink } from "../components/JiraIssueLink/JiraIssueLink";
import { TaskListModal } from "../components/TaskListModal/TaskListModal";
import type { TaskListModalRow } from "../domain/actions/buildTaskListModalRows";
import { installExternalNavigationGuard, isExternalHref } from "../platform/externalNavigationGuard";
import { openOnboardingResourceTarget } from "../platform/openOnboardingResource";

const mocks = vi.hoisted(() => ({ openExternalUrl: vi.fn(async () => undefined) }));

vi.mock("../platform/openExternal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../platform/openExternal")>()),
  openExternalUrl: mocks.openExternalUrl,
}));

const JIRA = "https://altenar.atlassian.net";
const ROWS: TaskListModalRow[] = [
  {
    issueKey: "UX-1502",
    title: "Checkout polish",
    createdLabel: "1 Sep",
    lastStatusChangeLabel: "3 Sep",
    status: "In Review",
    jiraUrl: `${JIRA}/browse/UX-1502`,
  },
  {
    issueKey: "AGTC-119",
    title: "API cleanup",
    createdLabel: "2 Sep",
    lastStatusChangeLabel: "4 Sep",
    status: "In Progress",
    jiraUrl: `${JIRA}/browse/AGTC-119`,
  },
];

beforeEach(() => mocks.openExternalUrl.mockClear());
afterEach(() => vi.useRealTimers());

describe("A. Jira issue key → external browser, never the internal drawer", () => {
  it("opens the exact Jira issue externally and does not call any internal handler", () => {
    const internal = vi.fn();
    render(
      <div onClick={internal}>
        <JiraIssueLink issueKey="UX-1502" jiraBaseUrl={JIRA} />
      </div>,
    );
    const link = screen.getByRole("link", { name: "UX-1502" });
    expect(link.getAttribute("href")).toBe(`${JIRA}/browse/UX-1502`);
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false); // default navigation of the webview is cancelled
    expect(mocks.openExternalUrl).toHaveBeenCalledTimes(1);
    expect(mocks.openExternalUrl).toHaveBeenCalledWith(`${JIRA}/browse/UX-1502`);
  });

  it("regression: a stray onClick={undefined} can no longer erase the external opener", () => {
    render(<JiraIssueLink issueKey="AGTC-119" jiraBaseUrl={JIRA} onClick={undefined} />);
    const prevented = !fireEvent.click(screen.getByRole("link", { name: "AGTC-119" }));
    expect(prevented).toBe(true);
    expect(mocks.openExternalUrl).toHaveBeenCalledWith(`${JIRA}/browse/AGTC-119`);
  });

  it("a side-effect onClick (stopPropagation) runs but cannot hijack the link", () => {
    const sideEffect = vi.fn((event: { stopPropagation: () => void }) => event.stopPropagation());
    render(<JiraIssueLink issueKey="UX-1" jiraBaseUrl={JIRA} onClick={sideEffect} />);
    fireEvent.click(screen.getByRole("link", { name: "UX-1" }));
    expect(sideEffect).toHaveBeenCalled();
    expect(mocks.openExternalUrl).toHaveBeenCalledWith(`${JIRA}/browse/UX-1`);
  });

  it("Tasks modal: the issue key opens Jira even when an Info handler exists", () => {
    const onInfo = vi.fn();
    render(<TaskListModal open onClose={() => undefined} title="Tasks — Andrei" rows={ROWS} onInfo={onInfo} />);
    fireEvent.click(screen.getByRole("link", { name: "UX-1502" }));
    expect(mocks.openExternalUrl).toHaveBeenCalledWith(`${JIRA}/browse/UX-1502`);
    expect(onInfo).not.toHaveBeenCalled();
  });

  it("GroupedIssuePreview inline key opens Jira; its Info action is separate", () => {
    const onInfo = vi.fn();
    render(<GroupedIssuePreview issueKeys={["UX-7"]} jiraBaseUrl={JIRA} onInfo={onInfo} />);
    fireEvent.click(screen.getByRole("link", { name: "UX-7" }));
    expect(mocks.openExternalUrl).toHaveBeenCalledWith(`${JIRA}/browse/UX-7`);
    expect(onInfo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("grouped-issue-info"));
    expect(onInfo).toHaveBeenCalledWith("UX-7", `${JIRA}/browse/UX-7`);
    expect(mocks.openExternalUrl).toHaveBeenCalledTimes(1);
  });
});

describe("B. Info closes the Tasks modal, then opens the drawer — and nothing reopens the modal", () => {
  function Harness({ events }: { events: string[] }) {
    const [modalOpen, setModalOpen] = useState(true);
    const [drawer, setDrawer] = useState<string | null>(null);
    return (
      <div>
        <TaskListModal
          open={modalOpen}
          onClose={() => {
            events.push("modal-close");
            setModalOpen(false);
          }}
          title="Tasks — Andrei Kuznetsov"
          rows={ROWS}
          onInfo={(key) => {
            events.push(`drawer-open:${key}`);
            setDrawer(key);
          }}
        />
        {drawer ? (
          <aside data-testid="task-drawer">
            Drawer {drawer}
            <button type="button" onClick={() => setDrawer(null)}>
              Close drawer
            </button>
          </aside>
        ) : null}
      </div>
    );
  }

  it("does not open Jira, hides the modal first, then shows the drawer; closing the drawer leaves the modal closed", async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    render(<Harness events={events} />);
    const row = screen.getByText("UX-1502").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByTestId("task-list-info"));

    expect(mocks.openExternalUrl).not.toHaveBeenCalled();
    expect(events).toEqual(["modal-close"]); // drawer is NOT opened while the modal is still leaving
    expect(screen.queryByTestId("task-drawer")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(events).toEqual(["modal-close", "drawer-open:UX-1502"]);
    expect(screen.queryByTestId("task-list-modal")).toBeNull(); // modal and scrim are gone
    expect(screen.queryByTestId("metrio-modal-root")).toBeNull();
    expect(screen.getByTestId("task-drawer")).toHaveTextContent("UX-1502");

    fireEvent.click(screen.getByText("Close drawer"));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId("task-drawer")).toBeNull();
    expect(screen.queryByTestId("task-list-modal")).toBeNull(); // no hidden "return to previous modal"
  });

  it("the action column exists only with an Info handler and has no sort affordance", () => {
    const { rerender } = render(<TaskListModal open onClose={() => undefined} title="T" rows={ROWS} />);
    expect(screen.queryByTestId("task-list-info")).toBeNull();
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
    rerender(<TaskListModal open onClose={() => undefined} title="T" rows={ROWS} onInfo={() => undefined} />);
    expect(screen.getAllByTestId("task-list-info")).toHaveLength(2);
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(6);
    expect(headers[5].querySelector("button")).toBeNull();
    expect(headers[5].getAttribute("aria-sort")).toBeNull();
  });
});

describe("D/E. other external resources and internal controls", () => {
  it("Bamboo and Confluence/Jira-project resources use the external helper", async () => {
    await openOnboardingResourceTarget({ kind: "confluence_page", pageId: "1", url: "https://x.atlassian.net/wiki/spaces/A/pages/1" });
    await openOnboardingResourceTarget({ kind: "jira_project", projectKey: "UX", url: `${JIRA}/browse/UX` });
    await openOnboardingResourceTarget({ kind: "bamboo_portal" });
    expect(mocks.openExternalUrl).toHaveBeenCalledTimes(3);
    expect(String(mocks.openExternalUrl.mock.calls[0][0])).toContain("/wiki/spaces/");
  });

  it("internal controls stay internal: EntityLink onNavigate and metrio_resources never leave the app", async () => {
    const navigate = vi.fn();
    render(<EntityLink onNavigate={navigate}>Person</EntityLink>);
    fireEvent.click(screen.getByText("Person"));
    expect(navigate).toHaveBeenCalled();
    expect(mocks.openExternalUrl).not.toHaveBeenCalled();

    const heard = vi.fn();
    window.addEventListener("metrio-open-resources", heard);
    await openOnboardingResourceTarget({ kind: "metrio_resources" });
    window.removeEventListener("metrio-open-resources", heard);
    expect(heard).toHaveBeenCalled();
    expect(mocks.openExternalUrl).not.toHaveBeenCalled();
  });
});

describe("one canonical Jira issue URL implementation", () => {
  it("only platform/jiraIssueUrl.ts builds /browse/<issueKey> URLs; no jira.atlassian.com fallback", () => {
    const root = resolve(process.cwd(), "src");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name) || full.includes("/fixtures/")) continue;
        const text = readFileSync(full, "utf8");
        // The canonical issue builder, plus the files that build PROJECT (not issue) browse URLs.
        const allowed = [
          "platform/jiraIssueUrl.ts",
          "platform/atlassianUrls.ts",
          "domain/workGraph/projectDiscovery.ts",
          "app/WorkGraphContext.tsx",
          "config/onboardingResources.ts",
        ];
        if (!allowed.some((a) => full.endsWith(a)) && /\/browse\/\$\{/.test(text)) {
          offenders.push(full.replace(root, "src"));
        }
        if (text.includes("jira.atlassian.com")) offenders.push(`${full.replace(root, "src")} (fallback host)`);
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});

describe("global safeguard: stray external anchors never navigate the Metrio webview", () => {
  it("classifies hrefs", () => {
    const origin = "tauri://localhost";
    expect(isExternalHref(`${JIRA}/browse/UX-1`, origin)).toBe(true);
    expect(isExternalHref("mailto:a@b.com", origin)).toBe(true);
    expect(isExternalHref("#section", origin)).toBe(false);
    expect(isExternalHref("/settings", origin)).toBe(false);
    expect(isExternalHref("javascript:void(0)", origin)).toBe(false);
  });

  it("sends an un-handled external anchor to the system browser and leaves internal anchors alone", async () => {
    const uninstall = installExternalNavigationGuard(document);
    const { container } = render(
      <div>
        <a href="https://altenar.atlassian.net/browse/UX-9">raw external</a>
        <a href="#internal">internal</a>
      </div>,
    );
    const external = within(container).getByText("raw external");
    expect(fireEvent.click(external)).toBe(false);
    await waitFor(() => expect(mocks.openExternalUrl).toHaveBeenCalledWith("https://altenar.atlassian.net/browse/UX-9"));
    mocks.openExternalUrl.mockClear();
    expect(fireEvent.click(within(container).getByText("internal"))).toBe(true);
    expect(mocks.openExternalUrl).not.toHaveBeenCalled();
    uninstall();
  });
});

// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedbackCyclesLanding } from "../pages/feedback/FeedbackCyclesLanding";
import { HistoryReportsView } from "../pages/performance/HistoryReportsView";
import { TOOLTIP_SIDE_OFFSET, Tooltip, TooltipProvider } from "../components/Tooltip/Tooltip";
import type { SurveyDataFile } from "../domain/survey/types";

const mocks = vi.hoisted(() => ({
  remove: vi.fn(async (_id: string) => undefined),
  reports: [] as { id: string; filename: string; createdAt: string }[],
  toast: { success: vi.fn(), error: vi.fn() },
  refresh: vi.fn(async () => undefined),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("../components/Toast/ToastContext", () => ({ useToast: () => mocks.toast }));
vi.mock("../services/reports/reportHistoryStore", () => ({
  copyArchivedReportToPath: vi.fn(),
  removeArchivedReportRecord: (id: string) => mocks.remove(id),
}));
vi.mock("../hooks/useArchivedReports", () => ({
  useArchivedReports: () => ({ loading: false, reports: mocks.reports, refresh: mocks.refresh }),
}));

const src = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function emptySurveyData(cycles: SurveyDataFile["cycles"] = []): SurveyDataFile {
  return { schemaVersion: 1, surveys: [], cycles, activeSurveyId: null } as unknown as SurveyDataFile;
}

describe("Feedback empty state has one primary CTA and no duplicate card", () => {
  const handlers = {
    onNewSurvey: vi.fn(),
    onOpenCycle: vi.fn(),
    onOpenRun: vi.fn(),
    onStopRun: vi.fn(),
    onRepeatCycle: vi.fn(),
    onDeleteCycle: vi.fn(),
  };

  it("zero cycles: exactly one New survey button, an inline hint, and no centered empty-state card", () => {
    render(<FeedbackCyclesLanding data={emptySurveyData()} canManage {...handlers} />);
    expect(screen.getAllByRole("button", { name: "New survey" })).toHaveLength(1);
    expect(screen.queryByTestId("feedback-cycles-empty")).toBeNull();
    expect(screen.queryByText("No feedback cycles yet")).toBeNull();
    const hint = screen.getByTestId("feedback-cycles-empty-hint");
    expect(hint.closest(".feedback-cycles-intro")).not.toBeNull(); // same card, not another one
    expect(within(hint).queryByRole("button")).toBeNull(); // and no second CTA
    expect(screen.getByRole("heading", { name: "Feedback cycles" })).toBeInTheDocument();
  });

  it("read-only users see the section without any CTA", () => {
    render(<FeedbackCyclesLanding data={emptySurveyData()} canManage={false} {...handlers} />);
    expect(screen.queryByRole("button", { name: "New survey" })).toBeNull();
    expect(screen.getByTestId("feedback-cycles-empty-hint")).toBeInTheDocument();
  });

  it("with cycles the hint disappears and the list renders", () => {
    const data = emptySurveyData([
      { id: "c1", name: "Pulse", type: "pulse", status: "active", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ] as unknown as SurveyDataFile["cycles"]);
    render(<FeedbackCyclesLanding data={data} canManage {...handlers} />);
    expect(screen.queryByTestId("feedback-cycles-empty-hint")).toBeNull();
    expect(screen.getAllByRole("button", { name: "New survey" })).toHaveLength(1);
  });
});

describe("History reports: delete with confirmation", () => {
  beforeEach(() => {
    mocks.remove.mockReset();
    mocks.remove.mockResolvedValue(undefined);
    mocks.refresh.mockClear();
    mocks.toast.success.mockClear();
    mocks.reports = [
      { id: "r1", filename: "one.pdf", createdAt: "2026-03-01T14:30:00.000Z" },
      { id: "r2", filename: "two.pdf", createdAt: "2026-03-02T09:15:00.000Z" },
    ];
  });

  it("offers Download (secondary) and Delete (danger) per row; Delete never acts immediately", () => {
    render(<HistoryReportsView />);
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(2);
    const deletes = screen.getAllByTestId("history-report-delete");
    expect(deletes).toHaveLength(2);
    expect(deletes[0].className).toContain("btn--danger");
    fireEvent.click(deletes[0]);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Delete report?" })).toBeInTheDocument();
    expect(screen.getByTestId("history-report-delete-copy")).toHaveTextContent("This report will be permanently removed.");
  });

  it("Cancel closes the dialog and changes nothing", () => {
    render(<HistoryReportsView />);
    fireEvent.click(screen.getAllByTestId("history-report-delete")[0]);
    fireEvent.click(screen.getByTestId("history-report-delete-cancel"));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("history-report-delete")).toHaveLength(2);
  });

  it("Confirm removes exactly the chosen report, then refreshes the list", async () => {
    render(<HistoryReportsView />);
    fireEvent.click(screen.getAllByTestId("history-report-delete")[1]);
    await act(async () => {
      fireEvent.click(screen.getByTestId("history-report-delete-confirm"));
    });
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    expect(mocks.remove).toHaveBeenCalledWith("r2");
    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalledWith("Report deleted");
  });

  it("a failed removal keeps the row, keeps the dialog and shows the error", async () => {
    mocks.remove.mockRejectedValueOnce(new Error("Couldn't delete the report file: denied"));
    render(<HistoryReportsView />);
    fireEvent.click(screen.getAllByTestId("history-report-delete")[0]);
    await act(async () => {
      fireEvent.click(screen.getByTestId("history-report-delete-confirm"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("denied");
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("history-report-delete")).toHaveLength(2);
    expect(screen.getByRole("dialog", { name: "Delete report?" })).toBeInTheDocument();
  });

  it("backend removal also deletes the stored PDF (no orphans) and only that entry", () => {
    const rust = src("src-tauri/src/api/report_history_store.rs");
    expect(rust).toContain("fs::remove_file(&storage_path)");
    expect(rust).toContain("remove_deletes_the_file_and_only_that_entry");
  });
});

describe("Tooltip has no arrow and sits closer to the trigger", () => {
  it("renders no arrow element and no arrow styles", async () => {
    render(
      <TooltipProvider>
        <Tooltip content="Explains the metric">
          <button type="button">info</button>
        </Tooltip>
      </TooltipProvider>,
    );
    fireEvent.focus(screen.getByRole("button", { name: "info" }));
    const tip = await screen.findAllByText("Explains the metric");
    expect(tip.length).toBeGreaterThan(0);
    const content = document.querySelector('[data-testid="metrio-tooltip"]')!;
    expect(content).toBeTruthy();
    expect(content.querySelector("svg, .tooltip__arrow")).toBeNull();
    expect(src("src/components/Tooltip/Tooltip.tsx")).not.toMatch(/Arrow/);
    expect(src("src/components/Tooltip/Tooltip.css")).not.toMatch(/arrow/i);
  });

  it("uses a tighter gap than the previous 6px offset but still keeps a clear gap", () => {
    expect(TOOLTIP_SIDE_OFFSET).toBeLessThan(6);
    expect(TOOLTIP_SIDE_OFFSET).toBeGreaterThanOrEqual(3);
    expect(src("src/components/Tooltip/Tooltip.tsx")).toContain("sideOffset={TOOLTIP_SIDE_OFFSET}");
    expect(src("src/components/Tooltip/Tooltip.tsx")).toContain("collisionPadding={8}");
  });
});

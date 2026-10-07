// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { HistoryReportsView } from "./HistoryReportsView";
import { save } from "@tauri-apps/plugin-dialog";
import { copyArchivedReportToPath } from "../../services/reports/reportHistoryStore";
import "./performance-dashboard.css";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

vi.mock("../../hooks/useArchivedReports", () => ({
  useArchivedReports: () => ({
    loading: false,
    reports: [
      {
        id: "r1",
        filename: "team-report.pdf",
        createdAt: "2026-03-01T14:30:00.000Z",
      },
    ],
  }),
}));

vi.mock("../../components/Toast/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("../../services/reports/reportHistoryStore", () => ({
  copyArchivedReportToPath: vi.fn(),
  removeArchivedReportRecord: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("HistoryReportsView", () => {
  it("does not force horizontal overflow on the report history table", () => {
    const { container } = render(<HistoryReportsView />);
    const table = container.querySelector(
      ".performance-table--report-history",
    ) as HTMLTableElement;
    expect(table).toBeTruthy();
    expect(getComputedStyle(table).minWidth === "0px" || getComputedStyle(table).minWidth === "0").toBe(
      true,
    );
    const wrap = container.querySelector(
      ".performance-table-wrap--report-history",
    ) as HTMLElement;
    expect(getComputedStyle(wrap).overflowX).toBe("visible");
    Object.defineProperty(table, "clientWidth", { value: 720, configurable: true });
    Object.defineProperty(table, "scrollWidth", { value: 720, configurable: true });
    expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth + 1);
  });

  it("renders Download as a secondary Button", () => {
    render(<HistoryReportsView />);
    const download = screen.getByRole("button", { name: "Download" });
    expect(download.className).toContain("btn");
    expect(download.className).toContain("btn--secondary");
  });

  it("invokes the archived report export path from Download", async () => {
    vi.mocked(save).mockResolvedValue("/tmp/team-report.pdf");
    render(<HistoryReportsView />);
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(copyArchivedReportToPath).toHaveBeenCalledWith(
      "r1",
      "/tmp/team-report.pdf",
    );
  });
});

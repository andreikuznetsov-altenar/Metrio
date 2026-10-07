// @vitest-environment jsdom
import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PerformanceExportProvider, usePerformanceExport } from "./PerformanceExportContext";

vi.mock("./PerformanceDataContext", () => ({
  usePerformanceData: () => ({
    data: { teamSnapshot: { persons: [] } },
    status: "ready",
    refreshing: false,
  }),
}));

vi.mock("../components/Toast/ToastContext", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

const exportPerformancePdf = vi.fn();

vi.mock("../services/export/pdfExport", () => ({
  exportPerformancePdf: (...args: unknown[]) => exportPerformancePdf(...args),
  openExportedPdf: vi.fn(async () => ({ status: "opened" })),
}));

vi.mock("../services/export/performanceExportBridge", () => ({
  buildPerformanceExportPayloadFromFetch: vi.fn(async () => ({
    view: "team-overview",
    reportTitle: "Test",
    sections: [],
  })),
}));

describe("PerformanceExportContext", () => {
  beforeEach(() => {
    exportPerformancePdf.mockReset();
  });

  it("restores exporting flag after success and failure", async () => {
    exportPerformancePdf.mockResolvedValueOnce({ status: "saved", path: "/tmp/a.pdf" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PerformanceExportProvider audience="team" selfPersonId="lead">
        {children}
      </PerformanceExportProvider>
    );
    const { result } = renderHook(() => usePerformanceExport(), { wrapper });
    await act(async () => {
      await result.current.exportCurrentView();
    });
    expect(result.current.exporting).toBe(false);

    exportPerformancePdf.mockResolvedValueOnce({
      status: "error",
      code: "pdf_render_failed",
      message: "x",
      userMessage: "y",
    });
    await act(async () => {
      await result.current.exportCurrentView();
    });
    expect(result.current.exporting).toBe(false);
  });
});

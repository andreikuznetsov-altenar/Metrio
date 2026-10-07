import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadArchivedReports } from "./reportHistoryStore";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("reportHistoryStore", () => {
  beforeEach(async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockReset();
  });

  it("loads archived reports newest first from native store", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue([
      {
        id: "b",
        createdAt: "2026-10-08T10:00:00.000Z",
        filename: "Metrio_Report_2026-10-08_10-00.pdf",
        storageName: "Metrio_Report_2026-10-08_10-00.pdf",
      },
      {
        id: "a",
        createdAt: "2026-10-07T15:02:00.000Z",
        filename: "Metrio_Report_2026-10-07_15-02.pdf",
        storageName: "Metrio_Report_2026-10-07_15-02.pdf",
      },
    ]);
    const reports = await loadArchivedReports();
    expect(reports[0]?.id).toBe("b");
    expect(invoke).toHaveBeenCalledWith("report_history_list");
  });
});

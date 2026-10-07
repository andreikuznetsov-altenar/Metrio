import { invoke } from "@tauri-apps/api/core";
import type { ArchivedReportRecord } from "../../domain/reports/reportHistoryTypes";

export async function loadArchivedReports(): Promise<ArchivedReportRecord[]> {
  try {
    return await invoke<ArchivedReportRecord[]>("report_history_list");
  } catch {
    return [];
  }
}

export async function archiveExportedReport(
  bytes: Uint8Array,
  createdAt: string,
  filename: string,
): Promise<ArchivedReportRecord> {
  return invoke<ArchivedReportRecord>("report_history_archive", {
    bytes: Array.from(bytes),
    createdAt,
    filename,
  });
}

export async function copyArchivedReportToPath(
  reportId: string,
  path: string,
): Promise<void> {
  await invoke("report_history_copy_to_path", { id: reportId, path });
}

export async function removeArchivedReportRecord(reportId: string): Promise<void> {
  await invoke("report_history_remove", { id: reportId });
}

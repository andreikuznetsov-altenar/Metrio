import { FileText } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { Button } from "../../components/Button/Button";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { useToast } from "../../components/Toast/ToastContext";
import {
  formatReportHistoryDate,
  formatReportHistoryTime,
} from "../../domain/reports/reportHistoryPresentation";
import { useArchivedReports } from "../../hooks/useArchivedReports";
import {
  copyArchivedReportToPath,
  removeArchivedReportRecord,
} from "../../services/reports/reportHistoryStore";

export function HistoryReportsView() {
  const { reports, loading } = useArchivedReports();
  const toast = useToast();

  const download = async (reportId: string, filename: string) => {
    const dest = await save({
      defaultPath: filename,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!dest) return;
    try {
      await copyArchivedReportToPath(reportId, dest);
      toast.success("Report saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("missing") || message.includes("not found")) {
        try {
          await removeArchivedReportRecord(reportId);
        } catch {
          // ignore cleanup failure
        }
        toast.error("Archived PDF is missing. Removed stale history entry.");
        return;
      }
      toast.error("Couldn't save the archived report");
    }
  };

  if (!loading && reports.length === 0) {
    return (
      <section aria-label="History reports" data-testid="history-reports-view">
        <EmptyState
          icon={<FileText size={28} strokeWidth={1.5} aria-hidden />}
          title="No reports yet"
          description="Export a PDF and it will appear here."
          testId="history-reports-empty"
        />
      </section>
    );
  }

  return (
    <section aria-label="History reports" data-testid="history-reports-view">
      <div className="performance-table-wrap performance-table-wrap--report-history">
        <table className="performance-table performance-table--report-history">
          <colgroup>
            <col className="col-date" />
            <col className="col-time" />
            <col className="col-action" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Time</th>
              <th scope="col" className="performance-table__action">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{formatReportHistoryDate(report.createdAt)}</td>
                <td>{formatReportHistoryTime(report.createdAt)}</td>
                <td className="performance-table__action">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void download(report.id, report.filename)}
                  >
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

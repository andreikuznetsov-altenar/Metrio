import { useState } from "react";
import { FileText } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { Button } from "../../components/Button/Button";
import { TableActionsHeader } from "../../components/Table/TableActionsHeader";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { useToast } from "../../components/Toast/ToastContext";
import {
  formatReportHistoryDate,
  formatReportHistoryTime,
} from "../../domain/reports/reportHistoryPresentation";
import type { ArchivedReportRecord } from "../../domain/reports/reportHistoryTypes";
import { useArchivedReports } from "../../hooks/useArchivedReports";
import {
  copyArchivedReportToPath,
  removeArchivedReportRecord,
} from "../../services/reports/reportHistoryStore";

export function HistoryReportsView() {
  const { reports, loading, refresh } = useArchivedReports();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<ArchivedReportRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDelete = () => {
    if (deleteBusy) return;
    setPendingDelete(null);
    setDeleteError(null);
  };

  // The row only disappears after the backend confirms removal; a failure keeps it and says why.
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await removeArchivedReportRecord(pendingDelete.id);
      await refresh();
      setPendingDelete(null);
      toast.success("Report deleted");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Couldn't delete the report.");
    } finally {
      setDeleteBusy(false);
    }
  };

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
              <TableActionsHeader className="performance-table__action" />
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{formatReportHistoryDate(report.createdAt)}</td>
                <td>{formatReportHistoryTime(report.createdAt)}</td>
                <td className="performance-table__action">
                  <div className="performance-table__action-group">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void download(report.id, report.filename)}
                    >
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      data-testid="history-report-delete"
                      aria-label={`Delete report ${formatReportHistoryDate(report.createdAt)} ${formatReportHistoryTime(report.createdAt)}`}
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(report);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={pendingDelete != null} onClose={closeDelete} title="Delete report?">
        <p data-testid="history-report-delete-copy">This report will be permanently removed.</p>
        {deleteError ? (
          <p className="history-report-delete__error" role="alert">
            {deleteError}
          </p>
        ) : null}
        <div className="history-report-delete__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={closeDelete}
            disabled={deleteBusy}
            data-testid="history-report-delete-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void confirmDelete()}
            disabled={deleteBusy}
            loading={deleteBusy}
            data-testid="history-report-delete-confirm"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </section>
  );
}

import { Modal } from "../Modal/Modal";
import type { TaskListModalRow } from "../../domain/actions/buildTaskListModalRows";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../Table/MetrioTable";

export function TaskListModal({
  open,
  onClose,
  title,
  rows,
  onOpenIssue,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: TaskListModalRow[];
  onOpenIssue?: (issueKey: string, url?: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div data-testid="task-list-modal">
      {rows.length === 0 ? (
        <p className="executive-secondary-line" role="status">
          No tasks to show.
        </p>
      ) : (
        <MetrioTableWrap>
          <table className={`${METRIO_TABLE_CLASS} performance-table--task-list`}>
            <thead>
              <tr>
                <th scope="col">Issue</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col">Last status change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.issueKey}>
                  <td>
                    {onOpenIssue && row.jiraUrl ? (
                      <button
                        type="button"
                        className="performance-table__link-button"
                        onClick={() => onOpenIssue(row.issueKey, row.jiraUrl)}
                      >
                        <span className="performance-table__issue-key">{row.issueKey}</span>
                        <span className="performance-table__issue-title">{row.title}</span>
                      </button>
                    ) : (
                      <>
                        <span className="performance-table__issue-key">{row.issueKey}</span>
                        <span className="performance-table__issue-title">{row.title}</span>
                      </>
                    )}
                  </td>
                  <td>{row.status}</td>
                  <td>{row.createdLabel}</td>
                  <td>{row.lastStatusChangeLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MetrioTableWrap>
      )}
      </div>
    </Modal>
  );
}

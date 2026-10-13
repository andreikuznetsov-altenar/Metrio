import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { readMotionModalMs } from "../../styles/motion";
import { useOptionalTaskJourney } from "../../app/TaskJourneyContext";
import { EmptyState } from "../EmptyState/EmptyState";
import { TabularModal } from "../Modal/TabularModal";
import type { TaskListModalRow } from "../../domain/actions/buildTaskListModalRows";
import { issueStatusBadgeVariant } from "../../domain/jira/issueStatusBadgeVariant";
import { JiraIssueLink } from "../JiraIssueLink/JiraIssueLink";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../Table/MetrioTable";
import { PerformanceTableColgroup } from "../Table/PerformanceTableColgroup";

export function TaskListModal({
  open,
  onClose,
  title,
  rows,
  onInfo: onInfoProp,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: TaskListModalRow[];
  /**
   * Opens Metrio's own task information drawer for a row. The Jira key itself ALWAYS opens the real
   * Jira issue externally; this explicit `Info` action is the only internal entry point.
   */
  onInfo?: (issueKey: string, url?: string) => void;
}) {
  // Inside the task-journey provider every Tasks modal offers Info (Metrio's own task drawer).
  const taskJourney = useOptionalTaskJourney();
  const onInfo =
    onInfoProp ??
    (taskJourney ? (issueKey: string) => taskJourney.openTaskJourney(issueKey) : undefined);

  // Info closes this modal first and opens the drawer only after the modal has finished leaving,
  // so a drawer is never rendered underneath an active modal/scrim and closing it does not reopen us.
  const openInfo = (issueKey: string, url?: string) => {
    onClose();
    window.setTimeout(() => onInfo?.(issueKey, url), readMotionModalMs());
  };

  return (
    <TabularModal open={open} onClose={onClose} title={title} testId="task-list-modal">
        {rows.length === 0 ? (
          <EmptyState
            title="No tasks to show for this selection."
            compact
            className="metrio-empty-state--modal"
          />
        ) : (
          <MetrioTableWrap className="metrio-scroll metrio-scroll--hidden-thumb">
            <table className={`${METRIO_TABLE_CLASS} performance-table--task-list`}>
              <PerformanceTableColgroup
                columns={[
                  "issueKey",
                  "title",
                  "date",
                  "date",
                  "status",
                  ...(onInfo ? (["action"] as const) : []),
                ]}
              />
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col">Title</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last status change</th>
                  <th scope="col">Status</th>
                  {onInfo ? (
                    <th scope="col" className="performance-table__action-head">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.issueKey} className="performance-table__task-row">
                    <td className="performance-table__issue-key-cell">
                      <JiraIssueLink
                        issueKey={row.issueKey}
                        browseUrl={row.jiraUrl}
                        className="performance-table__issue-key performance-table__issue-key-link"
                      />
                    </td>
                    <td className="performance-table__issue-title-cell">
                      <span className="performance-table__clamp" title={row.title}>
                        {row.title}
                      </span>
                    </td>
                    <td className="performance-table__date-cell">{row.createdLabel}</td>
                    <td className="performance-table__date-cell">
                      {row.lastStatusChangeLabel}
                    </td>
                    <td>
                      <Badge variant={issueStatusBadgeVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </td>
                    {onInfo ? (
                      <td className="performance-table__action-cell">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          data-testid="task-list-info"
                          aria-label={`Task info ${row.issueKey}`}
                          onClick={() => openInfo(row.issueKey, row.jiraUrl ?? undefined)}
                        >
                          Info
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </MetrioTableWrap>
        )}
    </TabularModal>
  );
}

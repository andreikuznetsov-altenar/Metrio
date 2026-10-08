import { Badge } from "../Badge/Badge";
import { EmptyState } from "../EmptyState/EmptyState";
import { TabularModal } from "../Modal/TabularModal";
import type { TaskListModalRow } from "../../domain/actions/buildTaskListModalRows";
import { issueStatusBadgeVariant } from "../../domain/jira/issueStatusBadgeVariant";
import { JiraIssueLink } from "../JiraIssueLink/JiraIssueLink";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { resolveJiraBaseUrl } from "../../config/product";
import { METRIO_TABLE_CLASS, MetrioTableWrap } from "../Table/MetrioTable";
import { PerformanceTableColgroup } from "../Table/PerformanceTableColgroup";

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
                columns={["issueKey", "title", "date", "date", "status"]}
              />
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col">Title</th>
                  <th scope="col">Created</th>
                  <th scope="col">Last status change</th>
                  <th scope="col">Status</th>
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
                        onClick={
                          onOpenIssue
                            ? (event) => {
                                event.preventDefault();
                                onOpenIssue(
                                  row.issueKey,
                                  row.jiraUrl ??
                                    buildJiraIssueBrowseUrl(
                                      resolveJiraBaseUrl(),
                                      row.issueKey,
                                    ),
                                );
                              }
                            : undefined
                        }
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
                  </tr>
                ))}
              </tbody>
            </table>
          </MetrioTableWrap>
        )}
    </TabularModal>
  );
}

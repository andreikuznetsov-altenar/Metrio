import { useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { EntityLink } from "../../components/EntityLink/EntityLink";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import type { GroupedAttentionSignal } from "./groupAttentionSignals";

const INITIAL_KEY_COUNT = 2;

export interface AttentionSignalsTableProps {
  groups: GroupedAttentionSignal[];
  jiraBaseUrl: string;
}

export function AttentionSignalsTable({
  groups,
  jiraBaseUrl,
}: AttentionSignalsTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="performance-table-wrap" data-testid="attention-signals-table">
      <table className="performance-table performance-table--attention-signals">
        <thead>
          <tr>
            <th>Signal</th>
            <th className="performance-table__num">Tasks</th>
            <th>Reason</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const rowKey = `${group.label}-${group.reason}`;
            const showAll = expanded[rowKey];
            const visibleKeys = showAll
              ? group.issueKeys
              : group.issueKeys.slice(0, INITIAL_KEY_COUNT);
            const hiddenCount = Math.max(0, group.issueKeys.length - visibleKeys.length);

            return (
              <tr key={rowKey}>
                <td>
                  <Badge variant={group.variant}>{group.label}</Badge>
                </td>
                <td className="performance-table__num">{group.taskCount}</td>
                <td>{group.reason}</td>
                <td>
                  {group.issueKeys.length === 0 ? (
                    "—"
                  ) : (
                    <div className="attention-signals-table__issues">
                      {visibleKeys.map((key) => (
                        <EntityLink
                          key={key}
                          href={buildJiraIssueBrowseUrl(jiraBaseUrl, key)}
                          mono
                        >
                          {key}
                        </EntityLink>
                      ))}
                      {hiddenCount > 0 ? (
                        <button
                          type="button"
                          className="attention-signals-table__more"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [rowKey]: true }))
                          }
                        >
                          View {hiddenCount} more
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

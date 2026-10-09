import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { TableActionsHeader } from "../../components/Table/TableActionsHeader";
import { SortableTableHeader } from "../../components/Table/SortableTableHeader";
import { useTableSort } from "../../components/Table/useTableSort";
import { resolveJiraBaseUrl } from "../../config/product";
import type { DeliveryRiskRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { JiraIssueLink } from "../../components/JiraIssueLink/JiraIssueLink";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";
import { useTaskJourney } from "../../app/TaskJourneyContext";

function statusVariant(status: string): "danger" | "warning" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("block")) return "danger";
  if (normalized.includes("review") || normalized.includes("rework")) {
    return "warning";
  }
  return "neutral";
}

const DELIVERY_RISK_COLUMNS = [
  { id: "issue", type: "issueKey" as const },
  { id: "description", type: "text" as const },
  { id: "owner", type: "person" as const },
  { id: "age", type: "duration" as const },
  { id: "riskReason", type: "text" as const },
  {
    id: "status",
    type: "status" as const,
    statusKind: "deliveryStatus" as const,
  },
];

export interface TeamDeliveryRiskViewProps {
  rows: DeliveryRiskRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamDeliveryRiskView({
  rows,
  onOpenPerson,
}: TeamDeliveryRiskViewProps) {
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const { openTaskJourney } = useTaskJourney();

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  const getValue = useMemo(
    () => (row: DeliveryRiskRow, columnId: string) => {
      switch (columnId) {
        case "issue":
          return row.issueKey;
        case "description":
          return row.issueTitle;
        case "owner":
          return row.ownerName || row.ownerId;
        case "age":
          return row.age;
        case "riskReason":
          return row.riskReason;
        case "status":
          return row.status;
        default:
          return "";
      }
    },
    [],
  );

  const { sortedRows, sort, toggleSort } = useTableSort(
    rows,
    DELIVERY_RISK_COLUMNS,
    getValue,
  );

  const openJourney = (row: DeliveryRiskRow) => {
    if (row.issue) {
      openTaskJourney(row.issue);
      return;
    }
    openTaskJourney(row.issueKey);
  };

  if (rows.length === 0) {
    return (
      <section aria-label="Delivery risk" data-testid="delivery-risk-view">
        <p className="performance-section-desc">{performanceHelp.deliveryRisk}</p>
        <div className="performance-empty performance-empty--compact">
          <span className="performance-empty__icon" aria-hidden>◎</span>
          <p className="performance-empty__message">No delivery risks for this period.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Delivery risk" data-testid="delivery-risk-view">
      <p className="performance-section-desc">{performanceHelp.deliveryRisk}</p>
      <div className="performance-table-wrap performance-table-wrap--delivery-risk">
        <table className="performance-table performance-table--interactive performance-table--delivery-risk">
          <colgroup>
            <col className="col-issue" />
            <col className="col-description" />
            <col className="col-owner" />
            <col className="col-num" />
            <col className="col-reason" />
            <col className="col-badge" />
            <col className="col-action" />
          </colgroup>
          <thead>
            <tr>
              <SortableTableHeader columnId="issue" label="Issue" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader
                columnId="description"
                label="Description"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader columnId="owner" label="Owner" sort={sort} onToggle={toggleSort} />
              <SortableTableHeader
                columnId="age"
                label="Age"
                sort={sort}
                onToggle={toggleSort}
                className="performance-table__num"

              />
              <SortableTableHeader
                columnId="riskReason"
                label="Risk reason"
                sort={sort}
                onToggle={toggleSort}
              />
              <SortableTableHeader columnId="status" label="Status" sort={sort} onToggle={toggleSort} />
              <TableActionsHeader className="performance-table__action" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const issueUrl = buildJiraIssueBrowseUrl(jiraBaseUrl, row.issueKey);
              return (
                <tr
                  key={row.issueKey}
                  className="performance-table__row--clickable"
                  onClick={() => openJourney(row)}
                >
                  <td className="performance-delivery-risk__key">
                    <JiraIssueLink
                      issueKey={row.issueKey}
                      jiraBaseUrl={jiraBaseUrl}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                  <td className="performance-table__cell--clamp-2" title={row.issueTitle}>
                    <span className="performance-table__clamp">{row.issueTitle}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="performance-table__person-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenPerson(row.ownerId);
                      }}
                    >
                      {row.ownerName || row.ownerId}
                    </button>
                  </td>
                  <td className="performance-table__num">{row.age}</td>
                  <td className="performance-table__reason">{row.riskReason}</td>
                  <td>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="performance-table__action">
                    <div
                      className="performance-table__action-controls"
                      data-testid="delivery-risk-action-cell"
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        className="performance-delivery-risk__jira-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          openJourney(row);
                        }}
                      >
                        View journey
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="performance-delivery-risk__jira-btn"
                        disabled={!issueUrl}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (issueUrl) void openExternalUrl(issueUrl);
                        }}
                      >
                        Open Jira
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

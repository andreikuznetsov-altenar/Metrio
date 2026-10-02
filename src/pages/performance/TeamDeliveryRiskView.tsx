import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { IconButton } from "../../components/IconButton/IconButton";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import { resolveJiraBaseUrl } from "../../config/product";
import type { DeliveryRiskRow } from "../../domain/performance";
import { performanceHelp } from "../../domain/performance/performanceHelp";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { loadPreferences } from "../../platform/preferences";
import { openExternalUrl } from "../../platform/openExternal";

function statusVariant(status: string): "danger" | "warning" | "neutral" {
  const normalized = status.toLowerCase();
  if (normalized.includes("block")) return "danger";
  if (normalized.includes("review") || normalized.includes("rework")) {
    return "warning";
  }
  return "neutral";
}

export interface TeamDeliveryRiskViewProps {
  rows: DeliveryRiskRow[];
  onOpenPerson: (personId: string) => void;
}

export function TeamDeliveryRiskView({
  rows,
  onOpenPerson,
}: TeamDeliveryRiskViewProps) {
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setJiraBaseUrl(resolveJiraBaseUrl(prefs));
    });
  }, []);

  if (rows.length === 0) {
    return (
      <section aria-label="Delivery risk">
        <p className="performance-section-desc">{performanceHelp.deliveryRisk}</p>
        <div className="performance-empty performance-empty--compact">
          <span className="performance-empty__icon" aria-hidden>
            ◎
          </span>
          <span>No delivery risks for this period.</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Delivery risk">
      <p className="performance-section-desc">{performanceHelp.deliveryRisk}</p>
      <div className="performance-table-wrap performance-table-wrap--delivery-risk">
        <table className="performance-table performance-table--interactive performance-table--delivery-risk">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Owner</th>
              <th className="performance-table__num">Age</th>
              <th>Risk reason</th>
              <th>Status</th>
              <th className="performance-table__action">Jira</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const issueUrl = buildJiraIssueBrowseUrl(jiraBaseUrl, row.issueKey);
              return (
                <tr key={row.issueKey}>
                  <td className="performance-delivery-risk__issue">
                    <span className="performance-issue-key">{row.issueKey}</span>
                    <span className="performance-delivery-risk__title">
                      {row.issueTitle}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="performance-table__person-link"
                      onClick={() => onOpenPerson(row.ownerId)}
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
                    <Tooltip content="Open in Jira">
                      <IconButton
                        label="Open in Jira"
                        disabled={!issueUrl}
                        onClick={() => {
                          if (issueUrl) void openExternalUrl(issueUrl);
                        }}
                      >
                        <ExternalLink size={16} strokeWidth={1.75} />
                      </IconButton>
                    </Tooltip>
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

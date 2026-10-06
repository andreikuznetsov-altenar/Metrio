import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import type { ExecutiveAttentionItem } from "../../../domain/home/executiveDashboardModel";
import { buildJiraIssueBrowseUrl } from "../../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../../platform/openExternal";

const TONE_VARIANT = {
  critical: "danger",
  warning: "warning",
  neutral: "neutral",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical",
  warning: "Watch",
  neutral: "Info",
} as const;

const ISSUE_KEY_PATTERN = /\b[A-Z][A-Z0-9]+-\d+\b/g;

function issueKeysForItem(item: ExecutiveAttentionItem): string[] {
  const fromField = item.issueKeys ?? [];
  if (fromField.length) return [...new Set(fromField)];
  const haystack = `${item.title} ${item.detail ?? ""}`;
  return [...new Set(haystack.match(ISSUE_KEY_PATTERN) ?? [])];
}

export function DashboardAttentionNow({
  items,
  onView,
  jiraBaseUrl,
}: {
  items: ExecutiveAttentionItem[];
  onView: (item: ExecutiveAttentionItem) => void;
  jiraBaseUrl?: string;
}) {
  if (!items.length) return null;

  const critical = items.filter((i) => i.severity === "critical").length;
  const warning = items.filter((i) => i.severity === "warning").length;

  const openJira = (issueKey: string) => {
    if (!jiraBaseUrl) return;
    void openExternalUrl(buildJiraIssueBrowseUrl(jiraBaseUrl, issueKey));
  };

  return (
    <section
      className="executive-dashboard__span-4 executive-panel"
      aria-label="Attention now"
      data-testid="dashboard-attention-now"
    >
      <div className="executive-panel__title-row">
        <h2 className="executive-panel__title">Attention now</h2>
        <span className="executive-attention-now__summary">
          {critical > 0 ? (
            <Badge variant="danger">{critical} critical</Badge>
          ) : null}
          {warning > 0 ? (
            <Badge variant="warning">{warning} watch</Badge>
          ) : null}
        </span>
      </div>
      <div className="executive-attention-now__table-wrap metrio-scroll">
        <table className="executive-attention-now__table">
          <thead>
            <tr>
              <th scope="col">Severity</th>
              <th scope="col">Subject</th>
              <th scope="col">Context</th>
              <th scope="col" className="executive-attention-now__action-col">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const keys = issueKeysForItem(item);
              return (
                <tr key={item.id}>
                  <td className="executive-attention-now__severity">
                    <Badge variant={TONE_VARIANT[item.severity]}>
                      {SEVERITY_LABEL[item.severity]}
                    </Badge>
                  </td>
                  <td className="executive-attention-now__subject">
                    {keys.length ? (
                      <span className="executive-attention-now__subject-line">
                        {keys.map((issueKey, index) => (
                          <span key={issueKey}>
                            {index > 0 ? " · " : null}
                            {jiraBaseUrl ? (
                              <button
                                type="button"
                                className="executive-attention-now__issue-link"
                                onClick={() => openJira(issueKey)}
                              >
                                {issueKey}
                              </button>
                            ) : (
                              issueKey
                            )}
                          </span>
                        ))}
                        {keys.length && item.title ? " — " : null}
                        {item.title}
                      </span>
                    ) : (
                      item.title
                    )}
                  </td>
                  <td className="executive-attention-now__context">
                    {item.detail ?? "—"}
                  </td>
                  <td className="executive-attention-now__action-col">
                    {item.viewTarget ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="executive-attention-now__view-btn"
                        onClick={() => onView(item)}
                      >
                        View
                      </Button>
                    ) : (
                      "—"
                    )}
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

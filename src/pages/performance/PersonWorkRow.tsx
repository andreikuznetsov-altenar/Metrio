import { ExternalLink } from "lucide-react";
import { Badge } from "../../components/Badge/Badge";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";

export interface PersonWorkRowProps {
  item: PersonWorkRowData;
}

export function PersonWorkRow({ item }: PersonWorkRowProps) {
  return (
    <div className="performance-work-row performance-work-row--person">
      <div className="performance-work-row__main">
        <div className="person-work-row__head">
          <span className="performance-work-row__key">{item.key}</span>
          <Badge variant="neutral" className="person-work-row__status">
            {item.status}
          </Badge>
        </div>
        <div className="performance-work-row__title performance-work-row__title--wrap">
          {item.title}
        </div>
        <div className="performance-work-row__meta person-work-row__foot">
          <span>
            {item.stageAge} in {item.status.toLowerCase().includes("review") ? "review" : "stage"}
          </span>
          <Tooltip content="Open in Jira">
            <button
              type="button"
              className="person-work-row__jira"
              aria-label={`Open ${item.key} in Jira`}
              onClick={() => {
                void (async () => {
                  const prefs = await loadPreferences();
                  const url = buildJiraIssueBrowseUrl(
                    resolveJiraBaseUrl(prefs),
                    item.key,
                  );
                  await openExternalUrl(url);
                })();
              }}
            >
              <ExternalLink size={15} strokeWidth={1.75} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>
      {item.healthVariant !== "neutral" ? (
        <Badge variant={item.healthVariant} className="person-work-row__health">
          {item.healthVariant === "danger"
            ? "Problematic"
            : item.healthVariant === "warning"
              ? "At risk"
              : "Active"}
        </Badge>
      ) : null}
    </div>
  );
}

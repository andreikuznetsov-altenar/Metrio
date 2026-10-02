import { ExternalLink } from "lucide-react";
import { Badge } from "../../components/Badge/Badge";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";

import { KnowledgePopover } from "./KnowledgePopover";
import type { WorkKnowledgeLink } from "../../domain/workGraph/workGraphTypes";

export interface PersonWorkRowProps {
  item: PersonWorkRowData;
  knowledgeLinks?: WorkKnowledgeLink[];
}

function stageAgeLabel(item: PersonWorkRowData): string {
  const inReview = /review/i.test(item.status);
  return `${item.stageAge} in ${inReview ? "review" : "stage"}`;
}

export function PersonWorkRow({ item, knowledgeLinks }: PersonWorkRowProps) {
  const healthBadge =
    item.healthVariant === "danger" ? (
      <Badge variant="danger">Problematic</Badge>
    ) : item.healthVariant === "warning" ? (
      <Badge variant="warning">At risk</Badge>
    ) : null;

  return (
    <div className="performance-work-row performance-work-row--person">
      <div className="performance-work-row__main">
        <div className="person-work-row__head">
          <span className="performance-work-row__key">{item.key}</span>
          <div className="person-work-row__head-badges">
            <Badge variant="neutral" className="person-work-row__status">
              {item.status}
            </Badge>
            {healthBadge}
          </div>
        </div>
        <div className="performance-work-row__title performance-work-row__title--wrap">
          {item.title}
        </div>
        <div className="performance-work-row__meta person-work-row__foot">
          <span>{stageAgeLabel(item)}</span>
          {knowledgeLinks?.length ? (
            <KnowledgePopover issueKey={item.key} links={knowledgeLinks} />
          ) : null}
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
    </div>
  );
}

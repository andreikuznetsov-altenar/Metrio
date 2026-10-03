import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";

import { KnowledgePopover } from "./KnowledgePopover";
import type { WorkKnowledgeLink } from "../../domain/workGraph/workGraphTypes";
import "./person-work-card.css";

export interface PersonWorkRowProps {
  item: PersonWorkRowData;
  knowledgeLinks?: WorkKnowledgeLink[];
  /** Card layout for person work tab and brief sections. */
  variant?: "card" | "inline";
}

function stageAgeLabel(item: PersonWorkRowData): string {
  const inReview = /review/i.test(item.status);
  return `${item.stageAge} in ${inReview ? "review" : "stage"}`;
}

async function openIssueInJira(issueKey: string) {
  const prefs = await loadPreferences();
  const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
  await openExternalUrl(url);
}

export function PersonWorkRow({
  item,
  knowledgeLinks,
  variant = "card",
}: PersonWorkRowProps) {
  const attentionBadge = item.attentionLabel ? (
    <Badge variant={item.healthVariant}>{item.attentionLabel}</Badge>
  ) : null;

  const openJira = () => void openIssueInJira(item.key);

  if (variant === "inline") {
    return (
      <div className="performance-work-row performance-work-row--person">
        <div className="performance-work-row__main">
          <div className="person-work-row__head">
            <button
              type="button"
              className="performance-entity-link performance-work-row__key"
              onClick={openJira}
            >
              {item.key}
            </button>
            <div className="person-work-row__head-badges">
              <Badge variant="neutral" className="person-work-row__status">
                {item.status}
              </Badge>
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
            <Button type="button" variant="secondary" onClick={openJira}>
              Open Jira
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="person-work-card" data-testid="person-work-card">
      <div className="person-work-card__head">
        <button
          type="button"
          className="performance-entity-link person-work-card__key"
          onClick={openJira}
        >
          {item.key}
        </button>
        <Badge variant="neutral">{item.status}</Badge>
      </div>
      <h4 className="person-work-card__title" title={item.title}>{item.title}</h4>
      <div className="person-work-card__foot">
        <div className="person-work-card__meta">
          <span>{stageAgeLabel(item)}</span>
          {attentionBadge}
          {knowledgeLinks?.length ? (
            <KnowledgePopover issueKey={item.key} links={knowledgeLinks} />
          ) : null}
        </div>
        <Button type="button" variant="secondary" onClick={openJira}>
          Open Jira
        </Button>
      </div>
    </article>
  );
}

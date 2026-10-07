import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { JiraIssueLink } from "../../components/JiraIssueLink/JiraIssueLink";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";
import { resolveJiraBaseUrl } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { openExternalUrl } from "../../platform/openExternal";

async function openIssueInJira(issueKey: string) {
  const prefs = await loadPreferences();
  const url = buildJiraIssueBrowseUrl(resolveJiraBaseUrl(prefs), issueKey);
  await openExternalUrl(url);
}

import { KnowledgePopover } from "./KnowledgePopover";
import type { WorkKnowledgeLink } from "../../domain/workGraph/workGraphTypes";
import "./person-work-card.css";

export interface PersonWorkRowProps {
  item: PersonWorkRowData;
  knowledgeLinks?: WorkKnowledgeLink[];
  jiraBaseUrl?: string;
  /** Card layout for person work tab and brief sections. */
  variant?: "card" | "inline";
}

function stageAgeLabel(item: PersonWorkRowData): string {
  const inReview = /review/i.test(item.status);
  return `${item.stageAge} in ${inReview ? "review" : "stage"}`;
}

export function PersonWorkRow({
  item,
  knowledgeLinks,
  jiraBaseUrl,
  variant = "card",
}: PersonWorkRowProps) {
  const attentionBadge = item.attentionLabel ? (
    <Badge variant={item.healthVariant}>{item.attentionLabel}</Badge>
  ) : null;
  const footPrimary = item.footMeta ?? stageAgeLabel(item);

  const openJira = () => {
    if (jiraBaseUrl) {
      void openExternalUrl(buildJiraIssueBrowseUrl(jiraBaseUrl, item.key));
      return;
    }
    void openIssueInJira(item.key);
  };

  if (variant === "inline") {
    return (
      <div className="performance-work-row performance-work-row--person performance-work-row--person-inline">
        <div className="performance-work-row__main">
          <div className="person-work-row__head">
            <JiraIssueLink
              issueKey={item.key}
              jiraBaseUrl={jiraBaseUrl}
              className="performance-work-row__key"
            />
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
            <span>{footPrimary}</span>
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
        <JiraIssueLink
          issueKey={item.key}
          jiraBaseUrl={jiraBaseUrl}
          className="person-work-card__key"
        />
        <Badge variant="neutral">{item.status}</Badge>
      </div>
      <h4 className="person-work-card__title" title={item.title}>{item.title}</h4>
      <div className="person-work-card__foot">
        <div className="person-work-card__meta">
          <span>{footPrimary}</span>
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

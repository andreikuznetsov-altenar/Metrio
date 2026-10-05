import { EntityLink } from "../../components/EntityLink/EntityLink";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";

export const ATTENTION_ISSUE_INITIAL_COUNT = 2;

export interface AttentionIssueLinksProps {
  issueKeys: string[];
  jiraBaseUrl: string;
  expanded: boolean;
  onExpand: () => void;
}

export function AttentionIssueLinks({
  issueKeys,
  jiraBaseUrl,
  expanded,
  onExpand,
}: AttentionIssueLinksProps) {
  if (issueKeys.length === 0) {
    return <>—</>;
  }

  const visibleKeys = expanded
    ? issueKeys
    : issueKeys.slice(0, ATTENTION_ISSUE_INITIAL_COUNT);
  const hiddenCount = Math.max(0, issueKeys.length - visibleKeys.length);

  return (
    <div className="attention-issue-links" onClick={(event) => event.stopPropagation()}>
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
          className="attention-issue-links__more"
          onClick={(event) => {
            event.stopPropagation();
            onExpand();
          }}
        >
          View {hiddenCount} more
        </button>
      ) : null}
    </div>
  );
}

import type { Person } from "../../domain/people/types";
import { GroupedIssuePreview } from "../../components/GroupedIssuePreview/GroupedIssuePreview";

/** @deprecated Use GroupedIssuePreview — only a single issue is shown inline. */
export const ATTENTION_ISSUE_INITIAL_COUNT = 1;

export interface AttentionIssueLinksProps {
  issueKeys: string[];
  jiraBaseUrl: string;
  persons?: Person[];
  modalTitle?: string;
  expanded?: boolean;
  onExpand?: () => void;
}

export function AttentionIssueLinks({
  issueKeys,
  jiraBaseUrl,
  persons,
  modalTitle,
}: AttentionIssueLinksProps) {
  return (
    <GroupedIssuePreview
      issueKeys={issueKeys}
      jiraBaseUrl={jiraBaseUrl}
      persons={persons}
      modalTitle={modalTitle}
    />
  );
}

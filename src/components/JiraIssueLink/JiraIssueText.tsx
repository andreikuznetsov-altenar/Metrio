import { Fragment } from "react";
import { JiraIssueLink } from "./JiraIssueLink";

const ISSUE_KEY_IN_TEXT = /\b([A-Z][A-Z0-9]+-\d+)\b/gi;

export function JiraIssueText({
  text,
  jiraBaseUrl,
}: {
  text: string;
  jiraBaseUrl?: string;
}) {
  const parts = text.split(ISSUE_KEY_IN_TEXT);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <JiraIssueLink
            key={`${part}-${index}`}
            issueKey={part.toUpperCase()}
            jiraBaseUrl={jiraBaseUrl}
          />
        ) : (
          <Fragment key={`text-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  );
}

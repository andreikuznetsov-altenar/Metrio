import type { AnchorHTMLAttributes, ReactNode } from "react";
import { resolveJiraBaseUrl } from "../../config/product";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import { EntityLink } from "../EntityLink/EntityLink";

export interface JiraIssueLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  issueKey: string;
  children?: ReactNode;
  jiraBaseUrl?: string;
  /** Full `/browse/KEY` URL when already resolved (e.g. task list rows). */
  browseUrl?: string | null;
  mono?: boolean;
}

/** Canonical interactive Jira issue key link for Metrio UI. */
export function JiraIssueLink({
  issueKey,
  jiraBaseUrl,
  browseUrl,
  mono = true,
  className,
  children,
  ...rest
}: JiraIssueLinkProps) {
  const href =
    browseUrl?.trim() ||
    buildJiraIssueBrowseUrl(jiraBaseUrl ?? resolveJiraBaseUrl(), issueKey);
  if (!href) {
    return <span className={className}>{issueKey}</span>;
  }
  const classes = ["jira-issue-link", className].filter(Boolean).join(" ");
  return (
    <EntityLink
      href={href}
      mono={mono}
      className={classes}
      data-issue-key={issueKey}
      data-testid="jira-issue-link"
      {...rest}
    >
      {children ?? issueKey}
    </EntityLink>
  );
}

import { useMemo, useState, type MouseEvent } from "react";
import { JiraIssueLink } from "../JiraIssueLink/JiraIssueLink";
import { TaskListModal } from "../TaskListModal/TaskListModal";
import {
  buildTaskListModalRowsFromIssueKeys,
  type TaskListModalRow,
} from "../../domain/actions/buildTaskListModalRows";
import {
  formatPersonTaskListModalTitle,
  formatTaskCountLabel,
} from "../../domain/actions/taskListModalPresentation";
import {
  shouldShowInlineTaskIssue,
  shouldShowTaskCountLink,
} from "../../domain/actions/taskIssueDisplayPolicy";
import type { Person } from "../../domain/people/types";
import type { IssueCatalog } from "../../domain/jira/issueCatalog";
import { useOptionalPerformanceIssueCatalog } from "../../app/PerformanceIssueCatalogContext";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import "./GroupedIssuePreview.css";

export interface GroupedIssuePreviewProps {
  issueKeys: string[];
  jiraBaseUrl: string;
  persons?: Person[];
  modalTitle?: string;
  modalRows?: TaskListModalRow[];
  issueCatalog?: IssueCatalog;
  onOpenIssue?: (issueKey: string, url?: string) => void;
  className?: string;
  /** @deprecated Use default policy (1 inline, >1 count). Kept for call-site clarity. */
  display?: "auto" | "count";
  personNameForModal?: string;
}

export function GroupedIssuePreview({
  issueKeys,
  jiraBaseUrl,
  persons = [],
  modalTitle = "Tasks",
  modalRows,
  issueCatalog: issueCatalogProp,
  onOpenIssue,
  className,
  personNameForModal,
}: GroupedIssuePreviewProps) {
  const contextCatalog = useOptionalPerformanceIssueCatalog();
  const issueCatalog = issueCatalogProp ?? contextCatalog;
  const [open, setOpen] = useState(false);
  const uniqueKeys = useMemo(
    () => [...new Set(issueKeys.filter(Boolean))],
    [issueKeys],
  );

  const rows = useMemo(
    () =>
      modalRows ??
      buildTaskListModalRowsFromIssueKeys(
        uniqueKeys,
        persons,
        jiraBaseUrl,
        issueCatalog,
      ),
    [modalRows, uniqueKeys, persons, jiraBaseUrl, issueCatalog],
  );

  if (uniqueKeys.length === 0) {
    return <>—</>;
  }

  const total = uniqueKeys.length;
  const resolvedTitle =
    personNameForModal && shouldShowTaskCountLink(total)
      ? formatPersonTaskListModalTitle(personNameForModal, total)
      : modalTitle;

  const openModal = (event: MouseEvent) => {
    event.stopPropagation();
    setOpen(true);
  };

  const modal = (
    <TaskListModal
      open={open}
      onClose={() => setOpen(false)}
      title={resolvedTitle}
      rows={rows}
      onOpenIssue={onOpenIssue}
    />
  );

  if (shouldShowTaskCountLink(total)) {
    return (
      <>
        <button
          type="button"
          className="grouped-issue-preview__count-link"
          data-testid="grouped-issue-count-link"
          onClick={openModal}
        >
          {formatTaskCountLabel(total)}
        </button>
        {modal}
      </>
    );
  }

  if (shouldShowInlineTaskIssue(total)) {
    const key = uniqueKeys[0];
    const href = buildJiraIssueBrowseUrl(jiraBaseUrl, key);
    return (
      <>
        <div
          className={["grouped-issue-preview", className].filter(Boolean).join(" ")}
          data-testid="grouped-issue-preview"
          onClick={(event) => event.stopPropagation()}
        >
          {onOpenIssue ? (
            <button
              type="button"
              className="grouped-issue-preview__inline-link"
              onClick={() => onOpenIssue(key, href)}
            >
              {key}
            </button>
          ) : (
            <JiraIssueLink issueKey={key} jiraBaseUrl={jiraBaseUrl} browseUrl={href} />
          )}
        </div>
        {modal}
      </>
    );
  }

  return null;
}

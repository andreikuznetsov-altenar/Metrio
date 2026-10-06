import { useMemo, useState } from "react";
import { EntityLink } from "../EntityLink/EntityLink";
import { TaskListModal } from "../TaskListModal/TaskListModal";
import {
  buildTaskListModalRowsFromIssueKeys,
  type TaskListModalRow,
} from "../../domain/actions/buildTaskListModalRows";
import {
  formatIssueCountLabel,
  formatPersonTaskListModalTitle,
} from "../../domain/actions/taskListModalPresentation";
import type { Person } from "../../domain/people/types";
import { buildJiraIssueBrowseUrl } from "../../platform/jiraIssueUrl";
import "./GroupedIssuePreview.css";

const INLINE_PREVIEW_MAX = 2;

export interface GroupedIssuePreviewProps {
  issueKeys: string[];
  jiraBaseUrl: string;
  persons?: Person[];
  modalTitle?: string;
  modalRows?: TaskListModalRow[];
  onOpenIssue?: (issueKey: string, url?: string) => void;
  className?: string;
  /** Count-only link (no inline issue keys) for Team Attention etc. */
  display?: "inline" | "count";
  personNameForModal?: string;
}

export function GroupedIssuePreview({
  issueKeys,
  jiraBaseUrl,
  persons = [],
  modalTitle = "Tasks",
  modalRows,
  onOpenIssue,
  className,
  display = "inline",
  personNameForModal,
}: GroupedIssuePreviewProps) {
  const [open, setOpen] = useState(false);
  const uniqueKeys = useMemo(
    () => [...new Set(issueKeys.filter(Boolean))],
    [issueKeys],
  );

  const rows = useMemo(
    () =>
      modalRows ??
      buildTaskListModalRowsFromIssueKeys(uniqueKeys, persons, jiraBaseUrl),
    [modalRows, uniqueKeys, persons, jiraBaseUrl],
  );

  if (uniqueKeys.length === 0) {
    return <>—</>;
  }

  const total = uniqueKeys.length;
  const resolvedTitle =
    personNameForModal && display === "count"
      ? formatPersonTaskListModalTitle(personNameForModal, total)
      : modalTitle;

  if (display === "count") {
    return (
      <>
        <button
          type="button"
          className="grouped-issue-preview__count-link"
          data-testid="grouped-issue-count-link"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          {formatIssueCountLabel(total)}
        </button>
        <TaskListModal
          open={open}
          onClose={() => setOpen(false)}
          title={resolvedTitle}
          rows={rows}
          onOpenIssue={onOpenIssue}
        />
      </>
    );
  }

  const previewKeys = uniqueKeys.slice(0, INLINE_PREVIEW_MAX);
  const showModalLink = total > INLINE_PREVIEW_MAX;

  return (
    <>
      <div
        className={["grouped-issue-preview", className].filter(Boolean).join(" ")}
        data-testid="grouped-issue-preview"
        onClick={(event) => event.stopPropagation()}
      >
        {previewKeys.map((key, index) => (
          <span key={key} className="grouped-issue-preview__key">
            {index > 0 ? (
              <span className="grouped-issue-preview__sep" aria-hidden>
                {" · "}
              </span>
            ) : null}
            <EntityLink href={buildJiraIssueBrowseUrl(jiraBaseUrl, key)} mono>
              {key}
            </EntityLink>
          </span>
        ))}
        {showModalLink ? (
          <>
            <span className="grouped-issue-preview__sep" aria-hidden>
              {" · "}
            </span>
            <button
              type="button"
              className="grouped-issue-preview__tasks-link"
              data-testid="show-grouped-tasks"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
            >
              Show {total} tasks
            </button>
          </>
        ) : null}
      </div>
      <TaskListModal
        open={open}
        onClose={() => setOpen(false)}
        title={resolvedTitle}
        rows={rows}
        onOpenIssue={onOpenIssue}
      />
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Plus } from "lucide-react";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { useOptionalToast } from "../Toast/ToastContext";
import {
  checkStaleReviewOrHold,
  type CompletionOption,
} from "../../domain/jira/issueCompletion";
import type { VerifiedIssueState } from "../../domain/jira/applyVerifiedIssueState";
import type { AuditIssue } from "../../domain/jira/types";
import {
  IssueCompletionError,
  type IssueCompletionService,
} from "../../services/jira/issueCompletionService";

export interface StaleCompletionActionProps {
  issue: AuditIssue;
  service: IssueCompletionService;
  /** Called only AFTER Jira confirmed the transition and the issue was re-read. */
  onVerified: (verified: VerifiedIssueState) => void;
  /** Injectable for deterministic tests. */
  now?: () => Date;
}

const FAILURE_MESSAGE = "Couldn’t update Jira status. Try again or open the task in Jira.";
const STALE_REFRESH_MESSAGE =
  "Jira was updated, but Metrio couldn’t confirm it yet. Refresh to see the latest status.";

/**
 * "Mark complete +" footer action. Renders nothing unless the issue is stale Review/Hold AND
 * Jira itself offers at least one executable terminal-success transition for this user.
 */
export function StaleCompletionAction({ issue, service, onVerified, now }: StaleCompletionActionProps) {
  const toast = useOptionalToast();
  const eligible = useMemo(
    () => checkStaleReviewOrHold(issue, now ? now() : new Date()).eligible,
    [issue, now],
  );
  const [options, setOptions] = useState<CompletionOption[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<CompletionOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptions([]);
    setMenuOpen(false);
    if (!eligible) return undefined;
    let cancelled = false;
    void service
      .fetchOptions(issue)
      .then((next) => {
        if (!cancelled) setOptions(next);
      })
      .catch(() => {
        // Jira is the authority: without a confirmed transition there is no action to offer.
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [eligible, issue, service]);

  if (!eligible || options.length === 0) return null;

  const closeConfirm = () => {
    if (submitting) return;
    setPending(null);
    setError(null);
  };

  const confirm = async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const verified = await service.complete(issue, pending);
      setSubmitting(false);
      setPending(null);
      onVerified(verified);
      toast?.success(`${issue.issueKey} moved to ${verified.currentStatus}`);
    } catch (e) {
      setSubmitting(false);
      if (e instanceof IssueCompletionError && e.kind === "stale_refresh") {
        setPending(null);
        toast?.error(STALE_REFRESH_MESSAGE);
        return;
      }
      setError(FAILURE_MESSAGE);
    }
  };

  return (
    <>
      <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Popover.Trigger asChild>
          <Button
            type="button"
            variant="secondary"
            className="task-completion__trigger"
            data-testid="task-mark-complete"
            disabled={submitting}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span>Mark complete</span>
            <Plus size={16} strokeWidth={1.75} aria-hidden data-testid="task-mark-complete-icon" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="task-completion__menu"
            role="menu"
            side="top"
            align="end"
            sideOffset={6}
            collisionPadding={12}
            data-testid="task-completion-menu"
          >
            {options.map((option) => (
              <button
                key={option.transitionId}
                type="button"
                role="menuitem"
                className="task-completion__item"
                data-testid="task-completion-option"
                onClick={() => {
                  setMenuOpen(false);
                  setError(null);
                  setPending(option);
                }}
              >
                Complete as {option.targetStatus}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Modal open={pending !== null} onClose={closeConfirm} title="Mark task complete?">
        <div data-testid="task-completion-confirm">
          <p className="task-completion__confirm-body">
            {issue.issueKey} will be moved to {pending?.targetStatus ?? ""} in Jira.
          </p>
          {error ? (
            <p className="task-completion__error" role="alert" data-testid="task-completion-error">
              {error}
            </p>
          ) : null}
          <div className="task-completion__confirm-actions">
            <Button type="button" variant="secondary" onClick={closeConfirm} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={() => void confirm()}
              data-testid="task-completion-confirm-button"
            >
              Mark complete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

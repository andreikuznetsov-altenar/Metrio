import { useState } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import {
  canEditGoalStructure,
  canUpdateManualProgress,
} from "../../domain/goals/goalAccess";
import { buildLinkedWorkContext } from "../../domain/goals/goalLinkedWork";
import { historyForGoal } from "../../domain/goals/goalHistory";
import { formatReviewDateLabel } from "../../domain/goals/goalReview";
import type { Goal, GoalHistoryEntry } from "../../domain/goals/goalTypes";
import type { CurrentUser } from "../../domain/types";
import type { Person } from "../../domain/people/types";
import { searchIssuesQuick } from "../../services/goals/goalJiraLinkSearch";
import "./goal-detail-drawer.css";

function goalStatusBadgeVariant(
  status: Goal["status"],
): "neutral" | "success" | "warning" {
  if (status === "active") return "success";
  if (status === "paused" || status === "draft") return "warning";
  return "neutral";
}

function formatGoalStatusLabel(status: Goal["status"]): string {
  if (status === "active") return "Active";
  return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
}

export interface GoalDetailDrawerProps {
  goal: Goal | null;
  open: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  ownerPerson: Person | null;
  teamPersons: Person[];
  history: GoalHistoryEntry[];
  onPatch: (goalId: string, patch: Partial<Goal>) => Promise<void>;
}

export function GoalDetailDrawer({
  goal,
  open,
  onClose,
  currentUser,
  ownerPerson,
  teamPersons,
  history,
  onPatch,
}: GoalDetailDrawerProps) {
  const [issueQuery, setIssueQuery] = useState("");
  const [issueResults, setIssueResults] = useState<string[]>([]);

  if (!goal) {
    return (
      <Drawer open={false} onClose={onClose} ariaLabel="Goal" size="analytics">
        {null}
      </Drawer>
    );
  }

  const work = buildLinkedWorkContext(goal, ownerPerson);
  const canEdit = canEditGoalStructure(currentUser, goal);
  const canProgress = canUpdateManualProgress(currentUser, goal);
  const goalHistory = historyForGoal(history, goal.id).slice(-8).reverse();

  const runIssueSearch = async () => {
    const keys = await searchIssuesQuick(issueQuery, teamPersons);
    setIssueResults(keys);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={goal.title}
      size="analytics"
      className="drawer--goal"
      header={
        <div className="goal-drawer__header-row">
          <h2 className="goal-drawer__title">{goal.title}</h2>
        </div>
      }
    >
      <div className="goal-drawer__body" data-testid="goal-detail-drawer">
        <div className="goal-drawer__status-row">
          <Badge variant={goalStatusBadgeVariant(goal.status)} data-testid="goal-status-badge">
            {formatGoalStatusLabel(goal.status)}
          </Badge>
          {goal.reviewDate ? (
            <span className="goal-drawer__review-meta">
              Review {formatReviewDateLabel(goal.reviewDate)}
            </span>
          ) : null}
        </div>

        {goal.description ? (
          <section className="goal-drawer__card" aria-label="Overview">
            <h3 className="goal-drawer__card-title">Overview</h3>
            <p className="goal-drawer__card-body">{goal.description}</p>
          </section>
        ) : null}

        {canProgress && goal.manualProgress ? (
          <section className="goal-drawer__card" aria-label="Progress">
            <h3 className="goal-drawer__card-title">Progress</h3>
            {goal.manualProgress.kind === "steps" ? (
              <Select
                label="Manual progress"
                value={goal.manualProgress.step}
                options={[
                  { value: "not_started", label: "Not started" },
                  { value: "in_progress", label: "In progress" },
                  { value: "completed", label: "Completed" },
                ]}
                onChange={(event) =>
                  void onPatch(goal.id, {
                    manualProgress: {
                      kind: "steps",
                      step: event.target.value as "not_started" | "in_progress" | "completed",
                    },
                  })
                }
              />
            ) : (
              <p className="goal-drawer__card-body">
                Manually maintained: {goal.manualProgress.value}%
              </p>
            )}
          </section>
        ) : null}

        <section className="goal-drawer__card" aria-label="Linked Jira work">
          <h3 className="goal-drawer__card-title">Linked Jira work</h3>
          <p className="goal-drawer__card-desc">
            Search Jira issues available in your team scope and link relevant work to this goal.
          </p>
          {goal.linkedJiraIssueKeys.length === 0 ? (
            <p className="goal-drawer__empty-linked" role="status">
              No Jira work linked yet.
            </p>
          ) : (
            <ul className="goal-drawer__linked-list">
              {goal.linkedJiraIssueKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          )}
          <p className="goal-drawer__facts">
            {work.linkedIssueCount} linked · {work.completedCount} completed ·{" "}
            {work.inReviewCount} in review · {work.activeCount} active
          </p>
          {work.linkedWorkCompletionLabel ? (
            <p className="goal-drawer__facts">{work.linkedWorkCompletionLabel}</p>
          ) : null}
          {canEdit ? (
            <div className="goal-drawer__search-card">
              <div className="goal-drawer__search-row">
                <Input
                  id={`goal-issue-search-${goal.id}`}
                  aria-label="Search issues"
                  value={issueQuery}
                  onChange={(e) => setIssueQuery(e.target.value)}
                  placeholder="Search issues…"
                />
                <Button type="button" variant="secondary" onClick={() => void runIssueSearch()}>
                  Search
                </Button>
              </div>
              <div className="goal-drawer__search-results">
                {issueResults.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      void onPatch(goal.id, {
                        linkedJiraIssueKeys: [...goal.linkedJiraIssueKeys, key],
                      })
                    }
                  >
                    Link {key}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {goal.linkedConfluencePageIds.length > 0 ? (
          <section className="goal-drawer__card" aria-label="Related knowledge">
            <h3 className="goal-drawer__card-title">Related knowledge</h3>
            <ul className="goal-drawer__linked-list">
              {goal.linkedConfluencePageIds.map((id) => (
                <li key={id}>Page {id}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {goalHistory.length > 0 ? (
          <section className="goal-drawer__card" aria-label="History">
            <h3 className="goal-drawer__card-title">History</h3>
            <ul className="goal-drawer__history">
              {goalHistory.map((entry) => (
                <li key={entry.id}>
                  {entry.field} · {entry.nextValue ?? "—"}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

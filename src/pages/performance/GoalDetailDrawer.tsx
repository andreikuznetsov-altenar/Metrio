import { useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
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
      header={<h2 className="goal-drawer__title">{goal.title}</h2>}
    >
      <div className="goal-drawer__body" data-testid="goal-detail-drawer">
        {goal.description ? <p>{goal.description}</p> : null}
        <p className="goal-drawer__meta">
          Status: {goal.status.replace("_", " ")}
          {goal.reviewDate
            ? ` · Review ${formatReviewDateLabel(goal.reviewDate)}`
            : ""}
        </p>

        {canProgress && goal.manualProgress ? (
          <section className="goal-drawer__section">
            <h3>Manual progress</h3>
            {goal.manualProgress.kind === "steps" ? (
              <select
                value={goal.manualProgress.step}
                onChange={(e) =>
                  void onPatch(goal.id, {
                    manualProgress: {
                      kind: "steps",
                      step: e.target.value as "not_started" | "in_progress" | "completed",
                    },
                  })
                }
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              <p>Manually maintained: {goal.manualProgress.value}%</p>
            )}
          </section>
        ) : null}

        <section className="goal-drawer__section">
          <h3>Linked Jira work</h3>
          <ul>
            {goal.linkedJiraIssueKeys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
          <p className="goal-drawer__facts">
            {work.linkedIssueCount} linked · {work.completedCount} completed ·{" "}
            {work.inReviewCount} in review · {work.activeCount} active
          </p>
          {work.linkedWorkCompletionLabel ? (
            <p className="goal-drawer__facts">{work.linkedWorkCompletionLabel}</p>
          ) : null}
          {canEdit ? (
            <div className="goal-drawer__link-row">
              <input
                value={issueQuery}
                onChange={(e) => setIssueQuery(e.target.value)}
                placeholder="Search issues in team scope"
              />
              <Button type="button" variant="ghost" onClick={() => void runIssueSearch()}>
                Search
              </Button>
            </div>
          ) : null}
          {issueResults.map((key) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              onClick={() =>
                void onPatch(goal.id, {
                  linkedJiraIssueKeys: [...goal.linkedJiraIssueKeys, key],
                })
              }
            >
              Link {key}
            </Button>
          ))}
        </section>

        {goal.linkedConfluencePageIds.length > 0 ? (
          <section className="goal-drawer__section">
            <h3>Confluence</h3>
            <ul>
              {goal.linkedConfluencePageIds.map((id) => (
                <li key={id}>Page {id}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {goalHistory.length > 0 ? (
          <section className="goal-drawer__section">
            <h3>History</h3>
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

import { ExternalLink } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { useBambooEmployeeGoals } from "../../hooks/useBambooEmployeeGoals";
import { milestoneSummary } from "../../domain/goals/normalizeBambooGoal";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { buildBambooGoalUrl } from "../../config/buildBambooGoalUrl";
import { openExternalUrl } from "../../platform/openExternal";
import { DrawerPanelPlaceholder } from "../../components/Drawer/DrawerPanelPlaceholder";
import "./goal-detail-drawer.css";
import "./performance-skeletons.css";

function formatDue(dueDate?: string | null): string {
  if (!dueDate) return "No due date";
  return `Due ${dueDate}`;
}

function formatStatus(goal: BambooGoal): string {
  switch (goal.status) {
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "closed":
      return "Closed";
    default:
      return goal.rawStatus || "Unknown";
  }
}

function ProfileGoalRow({
  goal,
  bambooEmployeeId,
}: {
  goal: BambooGoal;
  bambooEmployeeId: string;
}) {
  const milestones = milestoneSummary(goal);
  const openInBamboo = () => {
    const url = buildBambooGoalUrl({
      employeeId: bambooEmployeeId,
      goalId: goal.id,
    });
    void openExternalUrl(url);
  };
  return (
    <article
      className="person-profile-goal"
      data-testid="person-profile-goal"
      data-goal-id={goal.id}
    >
      <div className="person-profile-goal__title">{goal.title}</div>
      <div className="person-profile-goal__meta">
        <span>{goal.percentComplete}% complete</span>
        <span aria-hidden>·</span>
        <span>{formatDue(goal.dueDate)}</span>
        <span aria-hidden>·</span>
        <span>{formatStatus(goal)}</span>
      </div>
      {milestones ? (
        <div className="person-profile-goal__milestones">{milestones}</div>
      ) : null}
      <div className="person-profile-goal__actions">
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={openInBamboo}
          data-testid="person-profile-goal-open-in-bamboo"
        >
          <ExternalLink size={14} aria-hidden strokeWidth={1.75} />
          Open in Bamboo
        </Button>
      </div>
    </article>
  );
}

export function PersonProfileGoalsSection({
  bambooEmployeeId,
  enabled,
}: {
  bambooEmployeeId: string | null | undefined;
  enabled: boolean;
}) {
  const { goals, state, stale, errorMessage } = useBambooEmployeeGoals(
    bambooEmployeeId,
    "status-inProgress",
    enabled && Boolean(bambooEmployeeId),
  );

  return (
    <section
      className="person-profile-goals"
      data-testid="person-profile-goals"
      aria-label="Goals"
    >
      <h3 className="person-detail-drawer__section-title">Goals</h3>
      {stale ? (
        <p className="person-profile-goals__stale" role="status">
          Showing cached BambooHR goals
        </p>
      ) : null}

      {state === "loading" ? (
        <div
          className="performance-skeleton-drawer"
          data-testid="person-profile-goals-loading"
          aria-busy="true"
        >
          <div className="performance-skeleton-card" />
          <div className="performance-skeleton-card" />
        </div>
      ) : null}

      {state === "forbidden" ? (
        <DrawerPanelPlaceholder
          compact
          title="Goals aren't available with your BambooHR access."
        />
      ) : null}

      {state === "empty" ? (
        <DrawerPanelPlaceholder compact title="No active goals in BambooHR" />
      ) : null}

      {state === "error" && goals.length === 0 ? (
        <DrawerPanelPlaceholder
          compact
          title={errorMessage || "Could not load BambooHR goals."}
        />
      ) : null}

      {goals.length > 0 && state !== "forbidden" && bambooEmployeeId ? (
        <div className="person-profile-goals__list" data-testid="person-profile-goals-list">
          {goals.map((goal) => (
            <ProfileGoalRow
              key={goal.id}
              goal={goal}
              bambooEmployeeId={bambooEmployeeId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

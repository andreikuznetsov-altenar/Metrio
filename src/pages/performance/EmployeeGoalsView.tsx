import { useMemo, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Tabs } from "../../components/ui/Tabs";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import type { BambooGoal, BambooGoalStatusFilter } from "../../domain/goals/bambooGoalTypes";
import { useBambooEmployeeGoals } from "../../hooks/useBambooEmployeeGoals";
import { BambooCreateGoalForm } from "./BambooCreateGoalForm";
import { BambooGoalCard } from "./BambooGoalCard";
import { BambooGoalDetailDrawer } from "./BambooGoalDetailDrawer";
import "./goal-detail-drawer.css";
import "./performance-skeletons.css";

type GoalsTab = "active" | "completed" | "closed";

const TAB_TO_FILTER: Record<GoalsTab, BambooGoalStatusFilter> = {
  active: "status-inProgress",
  completed: "status-completed",
  closed: "status-closed",
};

export function EmployeeGoalsView({ personId }: { personId: string }) {
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const [tab, setTab] = useState<GoalsTab>("active");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<BambooGoal | null>(null);

  const person = useMemo(
    () => data?.teamSnapshot.persons.find((p) => p.id === personId) ?? null,
    [data, personId],
  );

  const bambooEmployeeId = person?.bamboo?.id ?? null;
  const isOwn = personId === currentUser.person.id;

  const { goals, state, stale, errorMessage, refresh, invalidate } =
    useBambooEmployeeGoals(
      bambooEmployeeId,
      TAB_TO_FILTER[tab],
      Boolean(bambooEmployeeId) && isOwn,
    );

  const onWriteSuccess = async () => {
    invalidate();
    await refresh({ force: true });
  };

  if (!isOwn) {
    return (
      <div className="employee-goals" data-testid="employee-goals">
        <p className="performance-inline-empty" role="status">
          Own Goals create/edit is limited to the current user in this pass.
        </p>
      </div>
    );
  }

  if (!bambooEmployeeId) {
    return (
      <div className="employee-goals" data-testid="employee-goals">
        <p className="performance-inline-empty" role="status">
          BambooHR employee identity is required for goals.
        </p>
      </div>
    );
  }

  return (
    <div className="employee-goals" data-testid="employee-goals">
      <div className="goals-view__toolbar">
        <Tabs
          aria-label="Goal status"
          value={tab}
          onChange={(id) => setTab(id as GoalsTab)}
          items={[
            { id: "active", label: "Active" },
            { id: "completed", label: "Completed" },
            { id: "closed", label: "Closed" },
          ]}
        />
        <Button
          type="button"
          onClick={() => setCreating(true)}
          data-testid="bamboo-create-goal-open"
        >
          Create goal
        </Button>
      </div>

      {stale ? (
        <p className="performance-inline-meta" role="status">
          Showing cached BambooHR goals
        </p>
      ) : null}

      {creating ? (
        <BambooCreateGoalForm
          ownerEmployeeId={bambooEmployeeId}
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void onWriteSuccess();
          }}
        />
      ) : null}

      {state === "loading" ? (
        <div
          className="performance-skeleton-drawer"
          data-testid="employee-goals-loading"
          aria-busy="true"
        >
          <div className="performance-skeleton-card" />
        </div>
      ) : null}

      {state === "forbidden" ? (
        <p className="performance-inline-empty" role="status">
          Goals aren&apos;t available with your BambooHR access.
        </p>
      ) : null}

      {state === "empty" ? (
        <p className="performance-inline-empty" role="status">
          No {tab} goals in BambooHR
        </p>
      ) : null}

      {state === "error" && goals.length === 0 ? (
        <p className="performance-inline-empty" role="status">
          {errorMessage || "Could not load BambooHR goals."}
        </p>
      ) : null}

      {goals.length > 0 && state !== "forbidden" ? (
        <div className="goal-card-grid" data-testid="bamboo-goals-grid">
          {goals.map((goal) => (
            <BambooGoalCard
              key={goal.id}
              goal={goal}
              onOpen={() => setSelected(goal)}
            />
          ))}
        </div>
      ) : null}

      <BambooGoalDetailDrawer
        open={selected != null}
        goal={selected}
        ownerEmployeeId={bambooEmployeeId}
        onClose={() => setSelected(null)}
        onChanged={() => void onWriteSuccess()}
      />
    </div>
  );
}

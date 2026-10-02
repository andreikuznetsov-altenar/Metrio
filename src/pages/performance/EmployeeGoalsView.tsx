import { useMemo, useState } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useGoals } from "../../hooks/useGoals";
import { GoalCard } from "./GoalCard";
import { GoalDetailDrawer } from "./GoalDetailDrawer";
import type { Goal } from "../../domain/goals/goalTypes";

export function EmployeeGoalsView({ personId }: { personId: string }) {
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const { goals, history, patchGoal } = useGoals();
  const [selected, setSelected] = useState<Goal | null>(null);

  const person = useMemo(
    () => data?.teamSnapshot.persons.find((p) => p.id === personId) ?? null,
    [data, personId],
  );

  const myGoals = useMemo(
    () =>
      goals.filter(
        (g) => g.ownerPersonId === personId && g.scope === "person",
      ),
    [goals, personId],
  );

  const active = myGoals.filter((g) => g.status === "active");

  return (
    <div className="employee-goals" data-testid="employee-goals">
      <p className="performance-inline-meta">
        {active.length} active goal{active.length === 1 ? "" : "s"}
      </p>
      <div className="goal-card-grid">
        {myGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            person={person}
            onOpen={() => setSelected(goal)}
          />
        ))}
      </div>
      {myGoals.length === 0 ? (
        <p className="performance-inline-empty" role="status">
          No goals yet. Your manager can add expectations here.
        </p>
      ) : null}
      <GoalDetailDrawer
        goal={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
        currentUser={currentUser}
        ownerPerson={person}
        teamPersons={data?.teamSnapshot.persons ?? []}
        history={history}
        onPatch={patchGoal}
      />
    </div>
  );
}

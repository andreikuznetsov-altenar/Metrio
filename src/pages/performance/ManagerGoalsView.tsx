import { useMemo, useState } from "react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useGoals } from "../../hooks/useGoals";
import { directReportIds } from "../../domain/goals/goalAccess";
import { goalNeedsDiscussion } from "../../domain/goals/goalReview";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { GoalCard } from "./GoalCard";
import { GoalDetailDrawer } from "./GoalDetailDrawer";
import type { Goal } from "../../domain/goals/goalTypes";

export function ManagerGoalsView() {
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const { goals, history, createGoal, patchGoal } = useGoals();
  const [selected, setSelected] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const persons = data?.teamSnapshot?.persons ?? [];
  const reports = directReportIds(currentUser);

  const managerGoals = useMemo(() => {
    return goals.filter((g) => {
      if (g.scope === "team") return true;
      return reports.includes(g.ownerPersonId);
    });
  }, [goals, reports]);

  const discussion = managerGoals.filter((g) => goalNeedsDiscussion(g));

  const ownerForSelected = selected
    ? persons.find((p) => p.id === selected.ownerPersonId) ?? null
    : null;

  const submitNewGoal = () => {
    const title = newTitle.trim();
    if (!title) return;
    void createGoal({
      title,
      ownerPersonId: currentUser.person.id,
      scope: "team",
    }).then(() => {
      setNewTitle("");
      setCreating(false);
    });
  };

  if (managerGoals.length === 0 && !creating) {
    return (
      <div className="manager-goals" data-testid="manager-goals">
        <section className="goals-empty-state" aria-label="Team goals">
          <h2 className="goals-empty-state__title">No team goals yet</h2>
          <p className="goals-empty-state__body">
            Create a goal to track agreed priorities and linked work.
          </p>
          <Button type="button" variant="primary" onClick={() => setCreating(true)}>
            Create team goal
          </Button>
        </section>
        <GoalDetailDrawer
          goal={selected}
          open={selected != null}
          onClose={() => setSelected(null)}
          currentUser={currentUser}
          ownerPerson={ownerForSelected}
          teamPersons={persons}
          history={history}
          onPatch={patchGoal}
        />
      </div>
    );
  }

  return (
    <div className="manager-goals" data-testid="manager-goals">
      {discussion.length > 0 ? (
        <p className="performance-inline-meta" data-testid="goal-review-due-hint">
          {discussion.length} goal review{discussion.length === 1 ? "" : "s"} may need discussion
        </p>
      ) : null}

      <div className="goal-card-grid">
        {managerGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            person={persons.find((p) => p.id === goal.ownerPersonId) ?? null}
            onOpen={() => setSelected(goal)}
          />
        ))}
      </div>

      {creating ? (
        <form
          className="manager-goals__create-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitNewGoal();
          }}
        >
          <Input
            id="new-team-goal-title"
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Team goal title"
            autoFocus
          />
          <div className="manager-goals__create-actions">
            <Button type="submit" variant="primary" disabled={!newTitle.trim()}>
              Add
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setCreating(true)}>
          Create team goal
        </Button>
      )}

      <GoalDetailDrawer
        goal={selected}
        open={selected != null}
        onClose={() => setSelected(null)}
        currentUser={currentUser}
        ownerPerson={ownerForSelected}
        teamPersons={persons}
        history={history}
        onPatch={patchGoal}
      />
    </div>
  );
}

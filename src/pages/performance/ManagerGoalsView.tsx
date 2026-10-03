import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { useGoals } from "../../hooks/useGoals";
import { directReportIds } from "../../domain/goals/goalAccess";
import { goalNeedsDiscussion } from "../../domain/goals/goalReview";
import { buildLinkedWorkContext } from "../../domain/goals/goalLinkedWork";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { GoalDetailDrawer } from "./GoalDetailDrawer";
import type { Goal } from "../../domain/goals/goalTypes";
import type { Person } from "../../domain/people/types";

function goalProgressLabel(goal: Goal, person: Person | null): string {
  if (goal.manualProgress?.kind === "steps") {
    if (goal.manualProgress.step === "completed") return "Completed";
    if (goal.manualProgress.step === "in_progress") return "In progress";
    return "Not started";
  }
  const work = buildLinkedWorkContext(goal, person);
  if (work.linkedIssueCount > 0) {
    return `${work.linkedIssueCount} linked`;
  }
  return goal.status.replace("_", " ");
}

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

  const intro = (
    <header className="goals-view__intro" data-testid="goals-intro">
      <h2 className="goals-view__title">Goals</h2>
      <p className="goals-view__description">
        Track agreed priorities and connect them with the Jira work that supports them.
      </p>
    </header>
  );

  if (managerGoals.length === 0 && !creating) {
    return (
      <div className="manager-goals" data-testid="manager-goals">
        {intro}
        <section
          className="goals-empty-state goals-empty-state--centered"
          aria-label="Team goals"
          data-testid="goals-empty-state"
        >
          <Target className="goals-empty-state__icon" size={28} strokeWidth={1.5} aria-hidden />
          <h3 className="goals-empty-state__title">No team goals yet</h3>
          <p className="goals-empty-state__body">
            Create a goal to keep agreed priorities and related work in one place.
          </p>
          <Button type="button" variant="secondary" onClick={() => setCreating(true)}>
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
      {intro}
      {discussion.length > 0 ? (
        <p className="performance-inline-meta" data-testid="goal-review-due-hint">
          {discussion.length} goal review{discussion.length === 1 ? "" : "s"} may need discussion
        </p>
      ) : null}

      <div className="goals-view__toolbar">
        <Button type="button" variant="secondary" onClick={() => setCreating(true)}>
          Create team goal
        </Button>
      </div>

      <div className="goals-list" data-testid="goals-list">
        {managerGoals.map((goal) => {
          const person = persons.find((p) => p.id === goal.ownerPersonId) ?? null;
          const work = buildLinkedWorkContext(goal, person);
          return (
            <article key={goal.id} className="goals-list__row" data-testid="goal-list-row">
              <div className="goals-list__main">
                <h3 className="goals-list__title">{goal.title}</h3>
                <p className="goals-list__meta">
                  Progress · {goalProgressLabel(goal, person)}
                </p>
                <p className="goals-list__meta">
                  Linked work · {work.linkedIssueCount} linked
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setSelected(goal)}>
                Open goal
              </Button>
            </article>
          );
        })}
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
            <Button type="submit" variant="secondary" disabled={!newTitle.trim()}>
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
      ) : null}

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

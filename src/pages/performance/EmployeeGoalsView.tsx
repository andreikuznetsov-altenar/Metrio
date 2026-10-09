import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Modal } from "../../components/Modal/Modal";
import { SegmentedControl } from "../../components/SegmentedControl/SegmentedControl";
import { useToast } from "../../components/Toast/ToastContext";
import { useCurrentUser } from "../../app/CurrentUserContext";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { buildBambooGoalUrl } from "../../config/buildBambooGoalUrl";
import { resolveBambooSubdomain } from "../../config/product";
import type { BambooGoal, BambooGoalStatusFilter } from "../../domain/goals/bambooGoalTypes";
import { useBambooEmployeeGoals } from "../../hooks/useBambooEmployeeGoals";
import { openExternalUrl } from "../../platform/openExternal";
import {
  BambooClient,
  BambooPermissionError,
} from "../../services/bamboo/bambooClient";
import { removeBambooGoalSidecar } from "../../services/goals/bambooGoalSidecar";
import { BambooCreateGoalDrawer } from "./BambooCreateGoalDrawer";
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

const EMPTY_COPY: Record<
  GoalsTab,
  { title: string; description: string; testId: string }
> = {
  active: {
    title: "No active goals",
    description: "Active goals from BambooHR will appear here.",
    testId: "bamboo-goals-empty-active",
  },
  completed: {
    title: "No completed goals",
    description: "Completed goals from BambooHR will appear here.",
    testId: "bamboo-goals-empty-completed",
  },
  closed: {
    title: "No closed goals",
    description: "Closed goals from BambooHR will appear here.",
    testId: "bamboo-goals-empty-closed",
  },
};

export function EmployeeGoalsView({ personId }: { personId: string }) {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const { data } = usePerformanceData();
  const [tab, setTab] = useState<GoalsTab>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<BambooGoal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BambooGoal | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const openInBamboo = (goal: BambooGoal) => {
    if (!bambooEmployeeId) return;
    try {
      const url = buildBambooGoalUrl({
        employeeId: bambooEmployeeId,
        goalId: goal.id,
      });
      void openExternalUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open BambooHR.");
    }
  };

  const removeGoalFromUi = (goalId: string) => {
    if (selected?.id === goalId) setSelected(null);
    if (pendingDelete?.id === goalId) setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !bambooEmployeeId) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const subdomain = resolveBambooSubdomain();
      if (!subdomain) throw new Error("BambooHR is not configured.");
      const client = new BambooClient({ subdomain });
      const deletedId = pendingDelete.id;
      await client.deleteGoal(bambooEmployeeId, deletedId);
      try {
        await removeBambooGoalSidecar(bambooEmployeeId, deletedId);
      } catch {
        // best-effort sidecar cleanup
      }
      removeGoalFromUi(deletedId);
      setPendingDelete(null);
      invalidate();
      await refresh({ force: true });
      toast.success("Goal deleted from BambooHR");
    } catch (e) {
      if (e instanceof BambooPermissionError) {
        setDeleteError(
          "You don't have permission to delete this goal in BambooHR.",
        );
      } else {
        setDeleteError(
          e instanceof Error ? e.message : "Could not delete goal.",
        );
      }
    } finally {
      setDeleteBusy(false);
    }
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

  const emptyCopy = EMPTY_COPY[tab];

  return (
    <div className="employee-goals" data-testid="employee-goals">
      <div className="goals-view__toolbar">
        <SegmentedControl
          ariaLabel="Goal status"
          value={tab}
          onChange={setTab}
          options={[
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "closed", label: "Closed" },
          ]}
        />
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
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

      <BambooCreateGoalDrawer
        open={createOpen}
        ownerEmployeeId={bambooEmployeeId}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          toast.success("Goal created in BambooHR");
          void onWriteSuccess();
        }}
      />

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
        <div className="employee-goals__empty">
          <EmptyState
            icon={<Target size={28} strokeWidth={1.5} aria-hidden />}
            title={emptyCopy.title}
            description={emptyCopy.description}
            testId={emptyCopy.testId}
          />
        </div>
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
              onOpenInBamboo={() => openInBamboo(goal)}
              onRequestDelete={() => {
                setDeleteError(null);
                setPendingDelete(goal);
              }}
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
        onDeleted={(goalId) => {
          removeGoalFromUi(goalId);
        }}
      />

      <Modal
        open={pendingDelete != null}
        onClose={() => {
          if (!deleteBusy) setPendingDelete(null);
        }}
        title="Delete goal?"
      >
        <p data-testid="bamboo-delete-confirm-copy">
          This goal will be deleted from BambooHR.
        </p>
        {deleteError ? (
          <p className="bamboo-goal-form__error" role="alert">
            {deleteError}
          </p>
        ) : null}
        <div className="bamboo-goal-detail__toolbar">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPendingDelete(null)}
            disabled={deleteBusy}
            data-testid="bamboo-delete-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void confirmDelete()}
            disabled={deleteBusy}
            loading={deleteBusy}
            data-testid="bamboo-delete-confirm"
          >
            Delete goal
          </Button>
        </div>
      </Modal>
    </div>
  );
}

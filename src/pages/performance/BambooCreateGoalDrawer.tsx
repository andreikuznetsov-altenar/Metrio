import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { Input } from "../../components/Input/Input";
import { MetrioDatePicker } from "../../components/DatePicker/MetrioDatePicker";
import { Switch } from "../../components/Switch/Switch";
import { Textarea } from "../../components/Textarea/Textarea";
import { resolveBambooSubdomain } from "../../config/product";
import type { BambooCreateGoalInput } from "../../domain/goals/bambooGoalTypes";
import { ensureOwnerInSharedWith } from "../../domain/goals/normalizeBambooGoal";
import {
  BambooClient,
  BambooPermissionError,
} from "../../services/bamboo/bambooClient";

const DEFAULT_MILESTONE_ROWS = 3;

function emptyMilestoneRows(count = DEFAULT_MILESTONE_ROWS): string[] {
  return Array.from({ length: count }, () => "");
}

export function BambooCreateGoalDrawer({
  open,
  ownerEmployeeId,
  onClose,
  onCreated,
}: {
  open: boolean;
  ownerEmployeeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestoneTitles, setMilestoneTitles] = useState<string[]>(emptyMilestoneRows());
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setUseMilestones(false);
    setMilestoneTitles(emptyMilestoneRows());
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    const subdomain = resolveBambooSubdomain();
    if (!subdomain || !ownerEmployeeId) return;
    const client = new BambooClient({ subdomain });
    void (async () => {
      try {
        setCanCreate(await client.canCreateGoals(ownerEmployeeId));
      } catch (e) {
        if (e instanceof BambooPermissionError) setCanCreate(false);
        else setCanCreate(false);
      }
    })();
  }, [open, ownerEmployeeId]);

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!dueDate.trim()) {
      setError("Due date is required");
      return;
    }
    const subdomain = resolveBambooSubdomain();
    if (!subdomain) {
      setError("BambooHR is not configured.");
      return;
    }
    const sharedWithEmployeeIds = ensureOwnerInSharedWith(ownerEmployeeId, [
      ownerEmployeeId,
    ]);
    const input: BambooCreateGoalInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate.trim(),
      sharedWithEmployeeIds,
      alignsWithOptionId: null,
    };
    if (useMilestones) {
      const milestones = milestoneTitles
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => ({ title: t }));
      if (milestones.length === 0) {
        setError("Add at least one milestone");
        return;
      }
      input.milestones = milestones;
    } else {
      input.percentComplete = 0;
    }

    setBusy(true);
    try {
      const client = new BambooClient({ subdomain });
      await client.createGoal(ownerEmployeeId, input);
      resetForm();
      onCreated();
      onClose();
    } catch (e) {
      if (e instanceof BambooPermissionError) {
        setError("Goals aren't available with your BambooHR access.");
      } else {
        setError(e instanceof Error ? e.message : "Could not create goal.");
      }
    } finally {
      setBusy(false);
    }
  };

  const header = <h2 className="goal-drawer__title">Create goal</h2>;

  const footer = (
    <div className="bamboo-create-goal-drawer__footer">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={busy}
        data-testid="bamboo-create-goal-cancel"
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        disabled={busy || canCreate === null || canCreate === false}
        loading={busy}
        onClick={() => void submit()}
        data-testid="bamboo-create-goal-submit"
      >
        Create goal
      </Button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      ariaLabel="Create goal"
      header={header}
      footer={footer}
      testId="bamboo-create-goal-drawer"
      className="bamboo-create-goal-drawer"
    >
      {canCreate === false ? (
        <p role="status" data-testid="bamboo-create-goal-forbidden">
          Goals aren&apos;t available with your BambooHR access.
        </p>
      ) : (
        <form
          className="bamboo-goal-form bamboo-goal-form--drawer"
          data-testid="bamboo-create-goal-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="bamboo-goal-title"
            required
          />
          <MetrioDatePicker
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
            popoverSide="top"
            layout="stacked"
            testId="bamboo-goal-due-date"
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does success look like?"
            rows={3}
            data-testid="bamboo-goal-description"
          />

          <div className="bamboo-goal-form__switch-row">
            <span className="field__label" id="bamboo-milestones-label">
              Use milestones
            </span>
            <Switch
              checked={useMilestones}
              onCheckedChange={(checked) => {
                setUseMilestones(checked);
                if (checked && milestoneTitles.length === 0) {
                  setMilestoneTitles(emptyMilestoneRows());
                }
              }}
              aria-label="Use milestones"
              data-testid="bamboo-goal-milestones-switch"
            />
          </div>

          {useMilestones ? (
            <div
              className="bamboo-goal-form__milestones"
              data-testid="bamboo-goal-milestones"
            >
              {milestoneTitles.map((titleValue, index) => (
                <div key={index} className="bamboo-goal-form__milestone-row">
                  <span className="bamboo-goal-form__milestone-index" aria-hidden>
                    {index + 1}
                  </span>
                  <Input
                    aria-label={`Milestone ${index + 1}`}
                    value={titleValue}
                    placeholder="Milestone, sub-goal or key result"
                    onChange={(e) => {
                      const next = [...milestoneTitles];
                      next[index] = e.target.value;
                      setMilestoneTitles(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="bamboo-goal-form__milestone-remove"
                    aria-label={`Remove milestone ${index + 1}`}
                    disabled={milestoneTitles.length <= 1}
                    onClick={() => {
                      setMilestoneTitles((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="bamboo-goal-form__add-milestone"
                onClick={() => setMilestoneTitles((prev) => [...prev, ""])}
                data-testid="bamboo-goal-add-milestone"
              >
                <Plus size={16} strokeWidth={1.75} aria-hidden />
                Add milestone
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="bamboo-goal-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </Drawer>
  );
}

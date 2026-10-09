import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { resolveBambooSubdomain } from "../../config/product";
import type {
  BambooCreateGoalInput,
  BambooGoalAlignmentOption,
  BambooGoalShareOption,
} from "../../domain/goals/bambooGoalTypes";
import { ensureOwnerInSharedWith } from "../../domain/goals/normalizeBambooGoal";
import {
  BambooClient,
  BambooPermissionError,
} from "../../services/bamboo/bambooClient";

type ProgressType = "simple" | "milestones";

export function BambooCreateGoalForm({
  ownerEmployeeId,
  onCreated,
  onCancel,
}: {
  ownerEmployeeId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [progressType, setProgressType] = useState<ProgressType>("simple");
  const [percentComplete, setPercentComplete] = useState(0);
  const [milestoneTitles, setMilestoneTitles] = useState<string[]>([""]);
  const [shareIds, setShareIds] = useState<string[]>([ownerEmployeeId]);
  const [alignId, setAlignId] = useState("");
  const [shareOptions, setShareOptions] = useState<BambooGoalShareOption[]>([]);
  const [alignOptions, setAlignOptions] = useState<BambooGoalAlignmentOption[]>([]);
  const [alignRestricted, setAlignRestricted] = useState(false);
  const [shareRestricted, setShareRestricted] = useState(false);
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      try {
        setShareOptions(await client.getGoalShareOptions(ownerEmployeeId));
      } catch (e) {
        // 403 or Bamboo 400 on shareOptions → owner-only sharing
        setShareRestricted(true);
        void e;
      }
      try {
        setAlignOptions(await client.getGoalAlignmentOptions(ownerEmployeeId));
      } catch (e) {
        if (e instanceof BambooPermissionError) setAlignRestricted(true);
      }
    })();
  }, [ownerEmployeeId]);

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
    const sharedWithEmployeeIds = ensureOwnerInSharedWith(ownerEmployeeId, shareIds);
    const input: BambooCreateGoalInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate.trim(),
      sharedWithEmployeeIds,
      alignsWithOptionId: alignId || null,
    };
    if (progressType === "milestones") {
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
      input.percentComplete = percentComplete;
      if (percentComplete === 100) {
        input.completionDate = dueDate.trim();
      }
    }

    setBusy(true);
    try {
      const client = new BambooClient({ subdomain });
      await client.createGoal(ownerEmployeeId, input);
      onCreated();
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

  if (canCreate === false) {
    return (
      <div className="bamboo-goal-form" data-testid="bamboo-create-goal-forbidden">
        <p role="status">Goals aren't available with your BambooHR access.</p>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form
      className="bamboo-goal-form"
      data-testid="bamboo-create-goal-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="bamboo-goal-form__field">
        <span>Title</span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="bamboo-goal-title"
        />
      </label>
      <label className="bamboo-goal-form__field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          data-testid="bamboo-goal-description"
        />
      </label>
      <label className="bamboo-goal-form__field">
        <span>Due date</span>
        <input
          required
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          data-testid="bamboo-goal-due-date"
        />
      </label>

      <fieldset className="bamboo-goal-form__field">
        <legend>Progress type</legend>
        <label>
          <input
            type="radio"
            name="progressType"
            checked={progressType === "simple"}
            onChange={() => setProgressType("simple")}
          />{" "}
          Simple
        </label>
        <label>
          <input
            type="radio"
            name="progressType"
            checked={progressType === "milestones"}
            onChange={() => setProgressType("milestones")}
          />{" "}
          Milestones
        </label>
      </fieldset>

      {progressType === "simple" ? (
        <label className="bamboo-goal-form__field">
          <span>Initial progress ({percentComplete}%)</span>
          <input
            type="range"
            min={0}
            max={100}
            value={percentComplete}
            onChange={(e) => setPercentComplete(Number(e.target.value))}
            data-testid="bamboo-goal-percent"
          />
        </label>
      ) : (
        <div className="bamboo-goal-form__field" data-testid="bamboo-goal-milestones">
          <span>Milestones</span>
          {milestoneTitles.map((titleValue, index) => (
            <input
              key={index}
              value={titleValue}
              placeholder={`Milestone ${index + 1}`}
              onChange={(e) => {
                const next = [...milestoneTitles];
                next[index] = e.target.value;
                setMilestoneTitles(next);
              }}
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMilestoneTitles((prev) => [...prev, ""])}
          >
            Add milestone
          </Button>
        </div>
      )}

      <div className="bamboo-goal-form__field">
        <span>Shared with</span>
        <p className="bamboo-goal-form__hint">Owner is always included.</p>
        {shareRestricted ? (
          <p role="status">Sharing options restricted — owner-only.</p>
        ) : (
          <select
            multiple
            value={shareIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
              setShareIds(ensureOwnerInSharedWith(ownerEmployeeId, selected));
            }}
            data-testid="bamboo-goal-share"
          >
            <option value={ownerEmployeeId}>Owner (you)</option>
            {shareOptions
              .filter((o) => o.employeeId !== ownerEmployeeId)
              .map((o) => (
                <option key={o.employeeId} value={o.employeeId}>
                  {o.displayName || o.employeeId}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="bamboo-goal-form__field">
        <span>Alignment</span>
        {alignRestricted ? (
          <p role="status">
            Alignment options are restricted by BambooHR permissions.
          </p>
        ) : (
          <select
            value={alignId}
            onChange={(e) => setAlignId(e.target.value)}
            data-testid="bamboo-goal-alignment"
          >
            <option value="">None</option>
            {alignOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title || o.id}
              </option>
            ))}
          </select>
        )}
      </div>

      {error ? (
        <p className="bamboo-goal-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bamboo-goal-form__actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || canCreate === null}>
          {busy ? "Creating…" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}

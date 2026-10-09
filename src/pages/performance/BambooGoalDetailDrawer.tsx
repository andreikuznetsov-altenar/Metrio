import { useEffect, useState } from "react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { resolveBambooSubdomain } from "../../config/product";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { ensureOwnerInSharedWith } from "../../domain/goals/normalizeBambooGoal";
import {
  BambooClient,
  BambooPermissionError,
} from "../../services/bamboo/bambooClient";
import { findBambooGoalSidecar } from "../../services/goals/bambooGoalSidecar";
import { loadGoalsData } from "../../services/goals/goalsPersistence";

export function BambooGoalDetailDrawer({
  open,
  goal,
  ownerEmployeeId,
  onClose,
  onChanged,
}: {
  open: boolean;
  goal: BambooGoal | null;
  ownerEmployeeId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<BambooGoal | null>(goal);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [alignId, setAlignId] = useState("");
  const [percent, setPercent] = useState(0);
  const [sidecarLinks, setSidecarLinks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writeForbidden, setWriteForbidden] = useState(false);

  useEffect(() => {
    if (!open || !goal) return;
    setDetail(goal);
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setDueDate(goal.dueDate ?? "");
    setShareIds(
      ensureOwnerInSharedWith(ownerEmployeeId, goal.sharedWithEmployeeIds),
    );
    setAlignId(goal.alignsWithOptionId ?? "");
    setPercent(goal.percentComplete);
    setError(null);
    setWriteForbidden(false);

    const subdomain = resolveBambooSubdomain();
    if (!subdomain) return;
    const client = new BambooClient({ subdomain });
    void (async () => {
      try {
        const aggregate = await client.getGoalAggregate(ownerEmployeeId, goal.id);
        if (aggregate) {
          setDetail(aggregate);
          setTitle(aggregate.title);
          setDescription(aggregate.description ?? "");
          setDueDate(aggregate.dueDate ?? "");
          setShareIds(
            ensureOwnerInSharedWith(
              ownerEmployeeId,
              aggregate.sharedWithEmployeeIds,
            ),
          );
          setAlignId(aggregate.alignsWithOptionId ?? "");
          setPercent(aggregate.percentComplete);
        }
      } catch (e) {
        if (e instanceof BambooPermissionError) setWriteForbidden(true);
      }
      try {
        const file = await loadGoalsData();
        const sidecar = findBambooGoalSidecar(file, ownerEmployeeId, goal.id);
        setSidecarLinks([
          ...(sidecar?.linkedJiraIssueKeys ?? []),
          ...(sidecar?.linkedJiraProjectKeys ?? []),
          ...(sidecar?.linkedConfluencePageIds ?? []),
        ]);
      } catch {
        setSidecarLinks([]);
      }
    })();
  }, [open, goal, ownerEmployeeId]);

  const saveDetails = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const subdomain = resolveBambooSubdomain();
      if (!subdomain) throw new Error("BambooHR is not configured.");
      const client = new BambooClient({ subdomain });
      // Omit milestones entirely for normal detail edits (Bamboo appends them).
      await client.updateGoal(ownerEmployeeId, detail.id, {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.trim(),
        sharedWithEmployeeIds: ensureOwnerInSharedWith(ownerEmployeeId, shareIds),
        alignsWithOptionId: alignId || null,
      });
      onChanged();
      onClose();
    } catch (e) {
      if (e instanceof BambooPermissionError) {
        setWriteForbidden(true);
        setError("Goals aren't available with your BambooHR access.");
      } else {
        setError(e instanceof Error ? e.message : "Could not update goal.");
      }
    } finally {
      setBusy(false);
    }
  };

  const saveProgress = async () => {
    if (!detail || detail.hasMilestones) return;
    setBusy(true);
    setError(null);
    try {
      const subdomain = resolveBambooSubdomain();
      if (!subdomain) throw new Error("BambooHR is not configured.");
      const client = new BambooClient({ subdomain });
      const completionDate =
        percent === 100 ? new Date().toISOString().slice(0, 10) : null;
      await client.updateGoalProgress(
        ownerEmployeeId,
        detail.id,
        percent,
        completionDate,
      );
      onChanged();
      onClose();
    } catch (e) {
      if (e instanceof BambooPermissionError) {
        setWriteForbidden(true);
        setError("Goals aren't available with your BambooHR access.");
      } else {
        setError(e instanceof Error ? e.message : "Could not update progress.");
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleMilestoneComplete = async (milestoneId: string, completed: boolean) => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const subdomain = resolveBambooSubdomain();
      if (!subdomain) throw new Error("BambooHR is not configured.");
      const client = new BambooClient({ subdomain });
      await client.updateMilestoneProgress(
        ownerEmployeeId,
        detail.id,
        milestoneId,
        completed
          ? { completed: true, completedDateTime: new Date().toISOString() }
          : { completed: false },
      );
      const aggregate = await client.getGoalAggregate(ownerEmployeeId, detail.id);
      if (aggregate) setDetail(aggregate);
      onChanged();
    } catch (e) {
      if (e instanceof BambooPermissionError) {
        setWriteForbidden(true);
        setError("Goals aren't available with your BambooHR access.");
      } else {
        setError(e instanceof Error ? e.message : "Could not update milestone.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open && detail != null}
      onClose={onClose}
      ariaLabel="Goal detail"
      size="person"
      testId="bamboo-goal-detail-drawer"
    >
      {detail ? (
        <div className="bamboo-goal-detail" data-testid="bamboo-goal-detail">
          <h2>{detail.title}</h2>
          {writeForbidden ? (
            <p role="status">Goals aren't available with your BambooHR access.</p>
          ) : (
            <>
              <label className="bamboo-goal-form__field">
                <span>Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="bamboo-edit-title"
                />
              </label>
              <label className="bamboo-goal-form__field">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </label>
              <label className="bamboo-goal-form__field">
                <span>Due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="bamboo-edit-due-date"
                />
              </label>
              <label className="bamboo-goal-form__field">
                <span>Shared with (owner always included)</span>
                <input
                  value={shareIds.join(",")}
                  onChange={(e) =>
                    setShareIds(
                      ensureOwnerInSharedWith(
                        ownerEmployeeId,
                        e.target.value.split(",").map((s) => s.trim()),
                      ),
                    )
                  }
                  data-testid="bamboo-edit-share"
                />
              </label>
              <label className="bamboo-goal-form__field">
                <span>Alignment option id (optional)</span>
                <input
                  value={alignId}
                  onChange={(e) => setAlignId(e.target.value)}
                  data-testid="bamboo-edit-alignment"
                />
              </label>
              <Button
                type="button"
                onClick={() => void saveDetails()}
                disabled={busy}
                data-testid="bamboo-save-details"
              >
                Save details
              </Button>

              {!detail.hasMilestones ? (
                <div className="bamboo-goal-form__field">
                  <span>Progress ({percent}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={percent}
                    onChange={(e) => setPercent(Number(e.target.value))}
                    data-testid="bamboo-edit-percent"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void saveProgress()}
                    disabled={busy}
                    data-testid="bamboo-save-progress"
                  >
                    Update progress
                  </Button>
                </div>
              ) : (
                <div data-testid="bamboo-milestones-list">
                  <h3>Milestones</h3>
                  <p className="bamboo-goal-form__hint">
                    Milestone titles cannot be renamed in place via BambooHR.
                    Progress updates use Bamboo&apos;s milestone progress API.
                  </p>
                  <ul>
                    {detail.milestones.map((m) => (
                      <li key={m.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(m.completed)}
                            disabled={busy}
                            onChange={(e) =>
                              void toggleMilestoneComplete(m.id, e.target.checked)
                            }
                          />{" "}
                          {m.title}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {sidecarLinks.length > 0 ? (
            <p className="bamboo-goal-form__hint" data-testid="bamboo-sidecar-links">
              Metrio links: {sidecarLinks.join(", ")}
            </p>
          ) : null}

          {error ? (
            <p className="bamboo-goal-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

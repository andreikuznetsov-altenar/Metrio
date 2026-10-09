import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "../../components/Button/Button";
import { Drawer } from "../../components/Drawer/Drawer";
import { Modal } from "../../components/Modal/Modal";
import { useToast } from "../../components/Toast/ToastContext";
import { buildBambooGoalUrl } from "../../config/buildBambooGoalUrl";
import { resolveBambooSubdomain } from "../../config/product";
import type { BambooGoal } from "../../domain/goals/bambooGoalTypes";
import { ensureOwnerInSharedWith } from "../../domain/goals/normalizeBambooGoal";
import { openExternalUrl } from "../../platform/openExternal";
import {
  BambooClient,
  BambooPermissionError,
} from "../../services/bamboo/bambooClient";
import {
  findBambooGoalSidecar,
  removeBambooGoalSidecar,
} from "../../services/goals/bambooGoalSidecar";
import { loadGoalsData } from "../../services/goals/goalsPersistence";

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

export function BambooGoalDetailDrawer({
  open,
  goal,
  ownerEmployeeId,
  onClose,
  onChanged,
  onDeleted,
}: {
  open: boolean;
  goal: BambooGoal | null;
  ownerEmployeeId: string;
  onClose: () => void;
  onChanged: () => void;
  onDeleted?: (goalId: string) => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<BambooGoal | null>(goal);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [alignId, setAlignId] = useState("");
  const [percent, setPercent] = useState(0);
  const [jiraKeys, setJiraKeys] = useState<string[]>([]);
  const [jiraProjects, setJiraProjects] = useState<string[]>([]);
  const [confluenceIds, setConfluenceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writeForbidden, setWriteForbidden] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    setConfirmDelete(false);

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
        setJiraKeys(sidecar?.linkedJiraIssueKeys ?? []);
        setJiraProjects(sidecar?.linkedJiraProjectKeys ?? []);
        setConfluenceIds(sidecar?.linkedConfluencePageIds ?? []);
      } catch {
        setJiraKeys([]);
        setJiraProjects([]);
        setConfluenceIds([]);
      }
    })();
  }, [open, goal, ownerEmployeeId]);

  const openInBamboo = () => {
    if (!detail) return;
    try {
      const url = buildBambooGoalUrl({
        employeeId: ownerEmployeeId,
        goalId: detail.id,
      });
      void openExternalUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open BambooHR.");
    }
  };

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

  const confirmDeleteGoal = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const subdomain = resolveBambooSubdomain();
      if (!subdomain) throw new Error("BambooHR is not configured.");
      const client = new BambooClient({ subdomain });
      const deletedId = detail.id;
      await client.deleteGoal(ownerEmployeeId, deletedId);
      try {
        await removeBambooGoalSidecar(ownerEmployeeId, deletedId);
      } catch {
        // Sidecar cleanup is best-effort after Bamboo delete succeeds.
      }
      setConfirmDelete(false);
      onDeleted?.(deletedId);
      onChanged();
      onClose();
      toast.success("Goal deleted from BambooHR");
    } catch (e) {
      if (e instanceof BambooPermissionError) {
        setWriteForbidden(true);
        setError("You don't have permission to delete this goal in BambooHR.");
      } else {
        setError(e instanceof Error ? e.message : "Could not delete goal.");
      }
    } finally {
      setBusy(false);
    }
  };

  const hasSidecar =
    jiraKeys.length > 0 || jiraProjects.length > 0 || confluenceIds.length > 0;

  return (
    <>
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

            <dl className="bamboo-goal-detail__summary" data-testid="bamboo-goal-summary">
              <div>
                <dt>Status</dt>
                <dd>{formatStatus(detail)}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>{detail.percentComplete}%</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{detail.dueDate || "No due date"}</dd>
              </div>
              {detail.completionDate ? (
                <div>
                  <dt>Completed</dt>
                  <dd>{detail.completionDate}</dd>
                </div>
              ) : null}
              <div>
                <dt>Owner</dt>
                <dd data-testid="bamboo-goal-owner">{ownerEmployeeId}</dd>
              </div>
              {detail.alignsWithOptionId ? (
                <div>
                  <dt>Alignment</dt>
                  <dd data-testid="bamboo-goal-alignment-value">
                    {detail.alignsWithOptionId}
                  </dd>
                </div>
              ) : null}
            </dl>

            {detail.description ? (
              <p className="bamboo-goal-detail__description" data-testid="bamboo-goal-description-view">
                {detail.description}
              </p>
            ) : null}

            <div className="bamboo-goal-detail__toolbar">
              <Button
                type="button"
                variant="secondary"
                onClick={openInBamboo}
                data-testid="bamboo-detail-open-in-bamboo"
              >
                <ExternalLink size={14} aria-hidden strokeWidth={1.75} />
                Open in Bamboo
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmDelete(true)}
                disabled={busy || writeForbidden}
                data-testid="bamboo-detail-delete"
              >
                Delete
              </Button>
            </div>

            {writeForbidden ? (
              <p role="status">Goals aren't available with your BambooHR access.</p>
            ) : (
              <>
                <h3 className="bamboo-goal-detail__section-title">Edit in Metrio</h3>
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
                    data-testid="bamboo-edit-description"
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
                            {m.percentComplete != null
                              ? ` (${m.percentComplete}%)`
                              : null}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {hasSidecar ? (
              <section
                className="bamboo-goal-detail__sidecar"
                data-testid="bamboo-sidecar-links"
                aria-label="Metrio links"
              >
                <h3 className="bamboo-goal-detail__section-title">Metrio links</h3>
                {jiraKeys.length > 0 ? (
                  <p>
                    <span className="bamboo-goal-form__hint">Linked Jira work: </span>
                    {jiraKeys.join(", ")}
                  </p>
                ) : null}
                {jiraProjects.length > 0 ? (
                  <p>
                    <span className="bamboo-goal-form__hint">Linked Jira projects: </span>
                    {jiraProjects.join(", ")}
                  </p>
                ) : null}
                {confluenceIds.length > 0 ? (
                  <p>
                    <span className="bamboo-goal-form__hint">Linked Confluence: </span>
                    {confluenceIds.join(", ")}
                  </p>
                ) : null}
              </section>
            ) : null}

            {error ? (
              <p className="bamboo-goal-form__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete goal?"
      >
        <p id="bamboo-delete-goal-desc" data-testid="bamboo-delete-confirm-copy">
          This goal will be deleted from BambooHR.
        </p>
        <div className="bamboo-goal-detail__toolbar">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmDelete(false)}
            disabled={busy}
            data-testid="bamboo-delete-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void confirmDeleteGoal()}
            disabled={busy}
            loading={busy}
            data-testid="bamboo-delete-confirm"
          >
            Delete goal
          </Button>
        </div>
      </Modal>
    </>
  );
}

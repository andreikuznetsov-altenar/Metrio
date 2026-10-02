import { useMemo } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Drawer } from "../../components/Drawer/Drawer";
import { Tabs } from "../../components/Tabs/Tabs";
import { usePerformanceData } from "../../app/PerformanceDataContext";
import { personInitials } from "../../domain/types";
import { groupAttentionSignals, hiddenAttentionKeyCount } from "./groupAttentionSignals";
import "./person-detail-drawer.css";
import "./performance-dashboard.css";

export interface PersonDetailDrawerProps {
  personId: string;
  open: boolean;
  onClose: () => void;
}

function outcomeVariant(outcome: string): "success" | "warning" | "neutral" {
  if (/first pass/i.test(outcome)) return "success";
  if (/rework/i.test(outcome)) return "warning";
  return "neutral";
}

function WorkRow({
  item,
}: {
  item: { key: string; title: string; status: string };
}) {
  return (
    <div className="performance-work-row performance-work-row--drawer">
      <div className="performance-work-row__key">{item.key}</div>
      <div className="performance-work-row__main">
        <div className="performance-work-row__title performance-work-row__title--wrap">
          {item.title}
        </div>
        <Badge variant="neutral">{item.status}</Badge>
      </div>
    </div>
  );
}

export function PersonDetailDrawer({
  personId,
  open,
  onClose,
}: PersonDetailDrawerProps) {
  const { viewModels } = usePerformanceData();
  const person = viewModels?.getPerson(personId);
  const snapshot = viewModels?.getPersonDetail(personId);

  const displayName = snapshot?.personName || person?.bamboo.displayName || "—";
  const jobTitle = person?.bamboo.jobTitle || "—";

  const groupedAttention = useMemo(
    () => (snapshot ? groupAttentionSignals(snapshot.attention) : []),
    [snapshot],
  );

  const tabs = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    return [
      {
        value: "overview",
        label: "Overview",
        content: (
          <div className="person-detail-drawer__panel">
            <div className="person-detail-drawer__metrics">
              <div className="performance-person-detail__stat">
                <div className="performance-person-detail__stat-label">
                  Efficiency
                </div>
                <div className="performance-person-detail__stat-value">
                  {snapshot.efficiency}
                </div>
              </div>
              <div className="performance-person-detail__stat">
                <div className="performance-person-detail__stat-label">
                  First pass
                </div>
                <div className="performance-person-detail__stat-value">
                  {snapshot.firstPass}
                </div>
              </div>
              <div className="performance-person-detail__stat">
                <div className="performance-person-detail__stat-label">
                  Completed
                </div>
                <div className="performance-person-detail__stat-value">
                  {snapshot.completed}
                </div>
              </div>
              <div className="performance-person-detail__stat">
                <div className="performance-person-detail__stat-label">
                  Backflows
                </div>
                <div className="performance-person-detail__stat-value">
                  {snapshot.backflows}
                </div>
              </div>
            </div>

            <h3 className="person-detail-drawer__section-title">
              Attention signals
            </h3>
            {groupedAttention.length === 0 ? (
              <p className="person-detail-drawer__empty">
                No active attention signals.
              </p>
            ) : (
              <div className="performance-work-list">
                {groupedAttention.map((group) => {
                  const visibleKeys = group.issueKeys.slice(0, 2);
                  const extraKeys = hiddenAttentionKeyCount(
                    group.taskCount,
                    visibleKeys,
                  );
                  return (
                    <div
                      key={`${group.label}-${group.reason}`}
                      className="performance-work-row performance-work-row--drawer"
                    >
                      <div className="performance-work-row__main">
                        <div className="performance-attention-group__head">
                          <Badge variant={group.variant}>{group.label}</Badge>
                          <span className="performance-attention-group__count">
                            {group.taskCount}{" "}
                            {group.taskCount === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                        <div className="performance-work-row__meta">
                          {group.reason}
                        </div>
                        {visibleKeys.length > 0 || extraKeys > 0 ? (
                          <div className="performance-attention-group__keys">
                            {visibleKeys.map((key) => (
                              <Badge key={key} variant="neutral">
                                {key}
                              </Badge>
                            ))}
                            {extraKeys > 0 ? (
                              <span className="performance-attention-row__more">
                                +{extraKeys} more
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ),
      },
      {
        value: "work",
        label: "Work",
        content: (
          <div className="person-detail-drawer__panel">
            <div className="performance-work-list">
              {snapshot.activeWork.map((item) => (
                <WorkRow key={item.key} item={item} />
              ))}
            </div>
            {snapshot.problematicWork.length > 0 ? (
              <>
                <h3 className="person-detail-drawer__section-title">
                  Problematic tasks
                </h3>
                <div className="performance-work-list">
                  {snapshot.problematicWork.map((item) => (
                    <WorkRow key={`problem-${item.key}`} item={item} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ),
      },
      {
        value: "history",
        label: "History",
        content: (
          <div className="person-detail-drawer__panel">
            <div className="person-detail-drawer__history">
              {snapshot.history.map((row) => (
                <div key={row.key} className="person-detail-drawer__history-item">
                  <div className="person-detail-drawer__history-top">
                    <span className="performance-issue-key">{row.key}</span>
                    <Badge variant={outcomeVariant(row.outcome)}>
                      {row.outcome}
                    </Badge>
                  </div>
                  <div className="person-detail-drawer__history-title">
                    {row.title}
                  </div>
                  <div className="person-detail-drawer__history-meta">
                    <span>{row.project}</span>
                    <span aria-hidden>·</span>
                    <span>{row.completedOn}</span>
                    <span aria-hidden>·</span>
                    <span>{row.cycle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ];
  }, [groupedAttention, snapshot]);

  if (!snapshot) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={`Person detail for ${displayName}`}
      header={
        <div className="person-detail-drawer__identity">
          <span className="performance-avatar" aria-hidden>
            {personInitials(displayName)}
          </span>
          <div>
            <div className="person-detail-drawer__name">{displayName}</div>
            <div className="person-detail-drawer__role">{jobTitle}</div>
            <div className="person-detail-drawer__meta">
              {snapshot.availability} · {snapshot.workload} workload
            </div>
          </div>
        </div>
      }
    >
      <Tabs items={tabs} defaultValue="overview" />
    </Drawer>
  );
}

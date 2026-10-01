import { useMemo } from "react";
import { Badge } from "../../components/Badge/Badge";
import { Drawer } from "../../components/Drawer/Drawer";
import { Tabs } from "../../components/Tabs/Tabs";
import { personInitials, roleLabel } from "../../domain/types";
import { getPersonDetailSnapshot } from "../../fixtures/personDetail";
import { getPerson } from "../../fixtures/people";
import "./person-detail-drawer.css";
import "./performance-dashboard.css";

export interface PersonDetailDrawerProps {
  personId: string;
  open: boolean;
  onClose: () => void;
}

export function PersonDetailDrawer({
  personId,
  open,
  onClose,
}: PersonDetailDrawerProps) {
  const person = getPerson(personId);
  const snapshot = useMemo(
    () => getPersonDetailSnapshot(personId),
    [personId],
  );

  const tabs = useMemo(
    () => [
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
            {snapshot.attention.length === 0 ? (
              <p className="person-detail-drawer__empty">
                No active attention signals.
              </p>
            ) : (
              <div className="performance-work-list">
                {snapshot.attention.map((item) => (
                  <div key={item.reason} className="performance-work-row">
                    <div className="performance-work-row__main">
                      <Badge variant={item.variant}>{item.label}</Badge>
                      <div className="performance-work-row__meta">
                        {item.reason}
                      </div>
                    </div>
                  </div>
                ))}
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
                <div key={item.key} className="performance-work-row">
                  <div className="performance-work-row__key">{item.key}</div>
                  <div className="performance-work-row__main">
                    <div className="performance-work-row__title">
                      {item.title}
                    </div>
                    <div className="performance-work-row__meta">
                      {item.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        value: "history",
        label: "History",
        content: (
          <div className="person-detail-drawer__panel">
            <div className="performance-table-wrap">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Work</th>
                    <th>Completed</th>
                    <th>Cycle</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.history.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <div className="performance-work-row__key">
                          {row.key}
                        </div>
                        <div className="performance-work-row__title">
                          {row.title}
                        </div>
                      </td>
                      <td>{row.completedOn}</td>
                      <td>{row.cycle}</td>
                      <td>{row.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
    ],
    [snapshot],
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={`Person detail for ${person.name}`}
      header={
        <div className="person-detail-drawer__identity">
          <span className="performance-avatar" aria-hidden>
            {personInitials(person.name)}
          </span>
          <div>
            <div className="person-detail-drawer__name">{person.name}</div>
            <div className="person-detail-drawer__role">
              {roleLabel(person.role)}
            </div>
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

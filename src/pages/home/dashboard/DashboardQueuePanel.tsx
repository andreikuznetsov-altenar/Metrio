import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { PersonAvatar } from "../../../components/PersonAvatar/PersonAvatar";
import type { ActionItem } from "../../../domain/actions/actionTypes";
import { buildDashboardActionRow } from "../../../domain/actions/actionPresentation";
import { badgeVariantForAttentionLabel } from "../../../platform/attentionSemanticBadge";

export interface DashboardQueuePanelProps {
  title: string;
  workColumnLabel: string;
  items: ActionItem[];
  emptyMessage: string;
  onOpen: (item: ActionItem) => void;
  openLabel: (item: ActionItem) => string;
  footerAction?: { label: string; onClick: () => void };
  testId?: string;
}

export function DashboardQueuePanel({
  title,
  workColumnLabel,
  items,
  emptyMessage,
  onOpen,
  openLabel,
  footerAction,
  testId,
}: DashboardQueuePanelProps) {
  return (
    <section
      className="executive-panel executive-panel--flush"
      aria-label={title}
      data-testid={testId}
    >
      <h2 className="executive-panel__title">{title}</h2>
      {items.length === 0 ? (
        <p className="executive-secondary-line" role="status">{emptyMessage}</p>
      ) : (
        <table className="executive-queue-table">
          <thead>
            <tr>
              <th scope="col">{workColumnLabel}</th>
              <th scope="col">Reason</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const row = buildDashboardActionRow(item);
              return (
                <tr key={item.id} data-testid="dashboard-action-row">
                  <td>
                    <div className="executive-queue-table__work">
                      {item.personId && item.personName ? (
                        <PersonAvatar
                          personId={item.personId}
                          displayName={item.personName}
                          size="sm"
                        />
                      ) : null}
                      {row.subject}
                    </div>
                  </td>
                  <td>
                    <Badge variant={badgeVariantForAttentionLabel(row.reasonTag)}>
                      {row.reasonTag}
                    </Badge>
                  </td>
                  <td className="executive-queue-table__context">
                    {row.contextLine || row.statusLabel || "—"}
                  </td>
                  <td className="executive-queue-table__cta">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onOpen(item)}
                    >
                      {openLabel(item)}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {footerAction ? (
        <div className="home-card__actions">
          <Button type="button" variant="secondary" onClick={footerAction.onClick}>
            {footerAction.label}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

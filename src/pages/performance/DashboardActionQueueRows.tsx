import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { buildDashboardActionRow } from "../../domain/actions/actionPresentation";
import { badgeVariantForAttentionLabel } from "../../platform/attentionSemanticBadge";
import "./action-queue.css";

export interface DashboardActionQueueRowsProps {
  items: ActionItem[];
  onOpen: (item: ActionItem) => void;
  openLabel: (item: ActionItem) => string;
}

export function DashboardActionQueueRows({
  items,
  onOpen,
  openLabel,
}: DashboardActionQueueRowsProps) {
  return (
    <ul className="action-queue__dashboard-list">
      {items.map((item) => {
        const row = buildDashboardActionRow(item);
        return (
          <li
            key={item.id}
            className="action-queue__dashboard-row"
            data-testid="dashboard-action-row"
          >
            <span className="action-queue__dashboard-subject">
              {item.personId && item.personName ? (
                <PersonAvatar
                  personId={item.personId}
                  displayName={item.personName}
                  size="sm"
                />
              ) : null}
              {row.subject}
            </span>
            <Badge
              variant={badgeVariantForAttentionLabel(row.reasonTag)}
              className="action-queue__dashboard-badge"
            >
              {row.reasonTag}
            </Badge>
            <span className="action-queue__dashboard-context">
              {row.contextLine || row.statusLabel || "—"}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="action-queue__dashboard-cta"
              onClick={() => onOpen(item)}
            >
              {openLabel(item)}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

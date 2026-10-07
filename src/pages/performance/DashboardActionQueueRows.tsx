import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import type { DashboardQueueRow } from "../../domain/actions/buildDashboardQueueRows";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { badgeVariantForAttentionLabel } from "../../platform/attentionSemanticBadge";
import "./action-queue.css";

export interface DashboardActionQueueRowsProps {
  rows: DashboardQueueRow[];
  onOpen: (item: ActionItem) => void;
  openLabel: (item: ActionItem) => string;
}

export function DashboardActionQueueRows({
  rows,
  onOpen,
  openLabel,
}: DashboardActionQueueRowsProps) {
  return (
    <ul className="action-queue__dashboard-list">
      {rows.map((row) => (
        <li
          key={row.id}
          className="action-queue__dashboard-row"
          data-testid="dashboard-action-row"
        >
          <span className="action-queue__dashboard-person">
            {row.item.personId && row.item.personName ? (
              <PersonAvatar
                personId={row.item.personId}
                displayName={row.item.personName}
                size="sm"
              />
            ) : (
              <span className="action-queue__dashboard-person-slot" aria-hidden />
            )}
            <span className="action-queue__dashboard-person-label">{row.subject}</span>
          </span>
          <div className="action-queue__dashboard-reasons">
            {row.reasonTags.map((tag) => (
              <Badge
                key={tag}
                variant={badgeVariantForAttentionLabel(tag)}
                className="action-queue__dashboard-badge"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <span className="action-queue__dashboard-context">
            {row.contextLines.length ? row.contextLines.join(" · ") : "—"}
          </span>
          <Button
            type="button"
            variant="secondary"
            className="action-queue__dashboard-cta"
            onClick={() => onOpen(row.item)}
          >
            {openLabel(row.item)}
          </Button>
        </li>
      ))}
    </ul>
  );
}

import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { PersonAvatar } from "../../components/PersonAvatar/PersonAvatar";
import {
  dashboardQueueRowTier,
  type DashboardQueueRow,
} from "../../domain/actions/buildDashboardQueueRows";
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
          data-row-tier={
            dashboardQueueRowTier(row.item) === 0
              ? "grouped"
              : dashboardQueueRowTier(row.item) === 2
                ? "person"
                : "task"
          }
        >
          <div className="action-queue__dashboard-cell action-queue__dashboard-cell--person">
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
          </div>
          <div
            className="action-queue__dashboard-cell action-queue__dashboard-cell--tag"
            data-testid="dashboard-action-tag-cell"
          >
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
          </div>
          <div className="action-queue__dashboard-cell action-queue__dashboard-cell--context">
            <span className="action-queue__dashboard-context">
              {row.contextLines.length ? row.contextLines.join(" · ") : "—"}
            </span>
          </div>
          <div
            className="action-queue__dashboard-cell action-queue__dashboard-cell--action"
            data-testid="dashboard-action-cta-cell"
          >
            <Button
              type="button"
              variant="secondary"
              className="action-queue__dashboard-cta"
              onClick={() => onOpen(row.item)}
            >
              {openLabel(row.item)}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

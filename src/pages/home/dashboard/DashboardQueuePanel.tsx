import type { ActionItem } from "../../../domain/actions/actionTypes";
import { DashboardActionQueueRows } from "../../performance/DashboardActionQueueRows";
import { Button } from "../../../components/Button/Button";
import "../../performance/action-queue.css";

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
  items,
  emptyMessage,
  onOpen,
  openLabel,
  footerAction,
  testId,
}: DashboardQueuePanelProps) {
  return (
    <section
      className="executive-panel executive-panel--flush action-queue--dashboard"
      aria-label={title}
      data-testid={testId}
    >
      <h2 className="executive-panel__title">{title}</h2>
      {items.length === 0 ? (
        <p className="executive-secondary-line" role="status">{emptyMessage}</p>
      ) : (
        <DashboardActionQueueRows items={items} onOpen={onOpen} openLabel={openLabel} />
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

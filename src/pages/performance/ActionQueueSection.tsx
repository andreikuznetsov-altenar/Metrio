import { Button } from "../../components/Button/Button";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { buildDashboardQueueRows } from "../../domain/actions/buildDashboardQueueRows";
import { DashboardActionQueueRows } from "./DashboardActionQueueRows";
import "./action-queue.css";

export interface ActionQueueSectionProps {
  title: string;
  items: ActionItem[];
  emptyMessage: string;
  onOpen: (item: ActionItem) => void;
  openLabel?: (item: ActionItem) => string;
  footerAction?: { label: string; onClick: () => void };
  variant?: "default" | "dashboard";
}

export function ActionQueueSection({
  title,
  items,
  emptyMessage,
  onOpen,
  openLabel = () => "Open",
  footerAction,
  variant = "default",
}: ActionQueueSectionProps) {
  if (variant === "dashboard") {
    return (
      <section className="home-card action-queue action-queue--dashboard" aria-label={title}>
        <h2 className="home-card__title home-card__title--section">{title}</h2>
        {items.length === 0 ? (
          <p className="home-card__empty" role="status">{emptyMessage}</p>
        ) : (
          <>
            <div className="action-queue__dashboard-header" role="row" aria-hidden>
              <span className="action-queue__dashboard-header-cell">Person</span>
              <span className="action-queue__dashboard-header-cell">Tag</span>
              <span className="action-queue__dashboard-header-cell">Info</span>
              <span
                className="action-queue__dashboard-header-cell action-queue__dashboard-header-cell--end"
              >
                Action
              </span>
            </div>
            <DashboardActionQueueRows
              rows={buildDashboardQueueRows(items)}
              onOpen={onOpen}
              openLabel={openLabel}
            />
          </>
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

  return (
    <section className="action-queue" aria-label={title}>
      <h3 className="action-queue__title">{title}</h3>
      {items.length === 0 ? (
        <p className="action-queue__empty" role="status">{emptyMessage}</p>
      ) : (
        <ul className="action-queue__list">
          {items.map((item) => (
            <li key={item.id} className={`action-queue__row action-queue__row--${item.severity}`}>
              <div className="action-queue__body">
                <div className="action-queue__head">
                  <span className="action-queue__item-title">{item.title}</span>
                </div>
                {item.description ? (
                  <p className="action-queue__description">{item.description}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="action-queue__open"
                onClick={() => onOpen(item)}
              >
                {openLabel(item)}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {footerAction ? (
        <div className="action-queue__footer">
          <Button type="button" variant="secondary" onClick={footerAction.onClick}>
            {footerAction.label}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

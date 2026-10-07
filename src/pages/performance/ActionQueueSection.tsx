import { Button } from "../../components/Button/Button";
import type { ActionItem } from "../../domain/actions/actionTypes";
import { buildDashboardQueueRows } from "../../domain/actions/buildDashboardQueueRows";
import { DashboardActionQueueTable } from "../../components/Table/DashboardActionQueueTable";
import { JiraIssueText } from "../../components/JiraIssueLink/JiraIssueText";
import { resolveJiraBaseUrl } from "../../config/product";
import "./action-queue.css";

export interface ActionQueueSectionProps {
  title: string;
  items: ActionItem[];
  emptyMessage: string;
  onOpen: (item: ActionItem) => void;
  openLabel?: (item: ActionItem) => string;
  footerAction?: { label: string; onClick: () => void };
  variant?: "default" | "dashboard";
  workColumnLabel?: string;
}

export function ActionQueueSection({
  title,
  items,
  emptyMessage,
  onOpen,
  openLabel = () => "Open",
  footerAction,
  variant = "default",
  workColumnLabel = "Work",
}: ActionQueueSectionProps) {
  if (variant === "dashboard") {
    const rows = buildDashboardQueueRows(items);
    return (
      <section className="home-card action-queue action-queue--dashboard" aria-label={title}>
        <h2 className="home-card__title home-card__title--section">{title}</h2>
        {items.length === 0 ? (
          <p className="home-card__empty" role="status">{emptyMessage}</p>
        ) : (
          <DashboardActionQueueTable
            workColumnLabel={workColumnLabel}
            rows={rows}
            onOpen={onOpen}
            openLabel={openLabel}
            sortColumnId={null}
            sortDirection={null}
            onToggleSort={() => undefined}
            jiraBaseUrl={resolveJiraBaseUrl()}
          />
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
                  <span className="action-queue__item-title">
                    <JiraIssueText text={item.title} />
                  </span>
                </div>
                {item.description ? (
                  <p className="action-queue__description">
                    <JiraIssueText text={item.description} />
                  </p>
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

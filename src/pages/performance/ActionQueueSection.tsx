import { AlertCircle, Info } from "lucide-react";
import { Button } from "../../components/Button/Button";
import type { ActionItem } from "../../domain/actions/actionTypes";
import "./action-queue.css";

export interface ActionQueueSectionProps {
  title: string;
  items: ActionItem[];
  emptyMessage: string;
  onOpen: (item: ActionItem) => void;
  openLabel?: (item: ActionItem) => string;
  footerAction?: { label: string; onClick: () => void };
}

function severityIcon(severity: ActionItem["severity"]) {
  if (severity === "critical" || severity === "warning") {
    return <AlertCircle size={16} strokeWidth={1.75} aria-hidden />;
  }
  return <Info size={16} strokeWidth={1.75} aria-hidden />;
}

export function ActionQueueSection({
  title,
  items,
  emptyMessage,
  onOpen,
  openLabel = () => "Open",
  footerAction,
}: ActionQueueSectionProps) {
  return (
    <section className="action-queue" aria-label={title}>
      <h3 className="action-queue__title">{title}</h3>
      {items.length === 0 ? (
        <p className="action-queue__empty" role="status">
          {emptyMessage}
        </p>
      ) : (
        <ul className="action-queue__list">
          {items.map((item) => (
            <li key={item.id} className={`action-queue__row action-queue__row--${item.severity}`}>
              <span className="action-queue__icon">{severityIcon(item.severity)}</span>
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
                variant="ghost"
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

import { formatDistanceToNow, parseISO } from "date-fns";
import { AlertCircle, CalendarDays, RotateCcw, UserRound, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer } from "../components/Drawer/Drawer";
import { Button } from "../components/Button/Button";
import type { NotificationEvent } from "../platform/notificationEvents";
import {
  listNotificationEvents,
  markAllNotificationEventsRead,
  markNotificationEventRead,
} from "../platform/notificationEvents";
import "./notification-center.css";

function eventIcon(type: NotificationEvent["type"]) {
  if (type === "workload_change") return Workflow;
  if (type === "upcoming_time_off") return CalendarDays;
  if (type === "returns") return RotateCcw;
  if (type === "task_attention") return AlertCircle;
  return UserRound;
}

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (target: string) => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationCenter({
  open,
  onClose,
  onNavigate,
  onUnreadChange,
}: NotificationCenterProps) {
  const [events, setEvents] = useState<NotificationEvent[]>([]);

  const refresh = () => {
    const next = listNotificationEvents();
    setEvents(next);
    onUnreadChange?.(next.filter((event) => !event.readAt).length);
  };

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Notifications"
      className="drawer--notifications"
      header={
        <div className="notification-center__header">
          <h2 className="notification-center__title">Notifications</h2>
          <Button
            type="button"
            variant="ghost"
            disabled={!events.some((event) => !event.readAt)}
            onClick={() => {
              markAllNotificationEventsRead();
              refresh();
            }}
          >
            Mark all as read
          </Button>
        </div>
      }
    >
      {events.length === 0 ? (
        <p className="notification-center__empty">No notifications yet.</p>
      ) : (
        <ul className="notification-center__list">
          {events.map((event) => {
            const Icon = eventIcon(event.type);
            const unread = !event.readAt;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  className={
                    unread
                      ? "notification-center__item is-unread"
                      : "notification-center__item"
                  }
                  onClick={() => {
                    markNotificationEventRead(event.id);
                    refresh();
                    if (event.navigationTarget) {
                      onNavigate?.(event.navigationTarget);
                      onClose();
                    }
                  }}
                >
                  <span className="notification-center__icon" aria-hidden>
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <span className="notification-center__body">
                    <span className="notification-center__item-title">{event.title}</span>
                    <span className="notification-center__item-message">{event.message}</span>
                    <span className="notification-center__item-time">
                      {formatDistanceToNow(parseISO(event.createdAt), { addSuffix: true })}
                    </span>
                  </span>
                  {unread ? (
                    <span className="notification-center__unread-dot" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}

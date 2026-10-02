import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  MoreHorizontal,
  PlugZap,
  UserRoundCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { isToday, isYesterday, parseISO } from "date-fns";
import { Drawer } from "../components/Drawer/Drawer";
import { Button } from "../components/Button/Button";
import { IconButton } from "../components/IconButton/IconButton";
import { PersonAvatar } from "../components/PersonAvatar/PersonAvatar";
import { SegmentedControl } from "../components/SegmentedControl/SegmentedControl";
import { enrichInboxEvent } from "../domain/inbox/actionInboxModel";
import { loadPreferences } from "../platform/preferences";
import { openNotificationTarget } from "../platform/notificationNavigation";
import {
  formatNotificationExactTime,
  formatNotificationRelativeTime,
} from "../platform/notificationRelativeTime";
import type { NotificationEvent } from "../platform/notificationTypes";
import {
  inboxMatchesFilter,
  type InboxFilterId,
  type InboxSourceFilterId,
} from "../platform/notificationTypes";
import {
  clearNotificationHistory,
  listNotificationEventsOrThrow,
  NOTIFICATION_EVENTS_CHANGED,
} from "../platform/notificationEvents";
import {
  markActionInboxItemRead,
  markAllActionInboxItemsRead,
} from "../platform/inboxReadSync";
import type { SettingsSection } from "../pages/settings/types";
import "./notification-center.css";

const FILTER_OPTIONS: { value: InboxFilterId; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "actions", label: "Actions" },
];

const SOURCE_FILTER_OPTIONS: { value: InboxSourceFilterId; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "jira", label: "Jira" },
  { value: "bamboo", label: "Bamboo" },
  { value: "feedback", label: "Feedback" },
];

function inboxSourceLabel(source: string): string {
  switch (source) {
    case "jira":
      return "Jira";
    case "bamboo":
      return "BambooHR";
    case "feedback":
      return "Feedback";
    default:
      return "Metrio";
  }
}

function inboxActionLabel(event: NotificationEvent): string {
  if (event.type === "vacation_upcoming" || event.type === "vacation_reminder") {
    return "View";
  }
  return "Open";
}

function eventIcon(type: NotificationEvent["type"]): ComponentType<{ size?: number; strokeWidth?: number }> {
  switch (type) {
    case "task_attention":
    case "jira_assignment":
    case "jira_reassignment":
      return AlertTriangle;
    case "workload_change":
      return Activity;
    case "vacation_upcoming":
      return CalendarClock;
    case "vacation_reminder":
      return CalendarDays;
    case "vacation_return":
      return CalendarCheck;
    case "availability_change":
      return UserRoundCheck;
    case "integration_problem":
      return PlugZap;
    default:
      return CircleAlert;
  }
}

function groupLabel(dateIso: string): "Today" | "Yesterday" | "Earlier" {
  const date = parseISO(dateIso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return "Earlier";
}

function emptyMessage(filter: InboxFilterId, sourceFilter: InboxSourceFilterId): string {
  if (filter === "unread") return "No unread notifications";
  if (filter === "actions") return "No actions right now";
  if (sourceFilter !== "all") return `No ${sourceFilter} notifications`;
  return "No notifications yet";
}

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onOpenPerson: (personId: string) => void;
  onOpenSettings: (section: SettingsSection) => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationCenter({
  open,
  onClose,
  onOpenPerson,
  onOpenSettings,
  onUnreadChange,
}: NotificationCenterProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<InboxFilterId>("all");
  const [sourceFilter, setSourceFilter] = useState<InboxSourceFilterId>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const syncUnread = useCallback(
    (next: NotificationEvent[]) => {
      onUnreadChange?.(next.filter((event) => !event.readAt).length);
    },
    [onUnreadChange],
  );

  const refresh = useCallback(() => {
    try {
      const next = listNotificationEventsOrThrow();
      setEvents(next);
      setLoadError(false);
      syncUnread(next);
    } catch {
      setLoadError(true);
      setEvents([]);
      syncUnread([]);
    }
  }, [syncUnread]);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener(NOTIFICATION_EVENTS_CHANGED, onChanged);
    return () => window.removeEventListener(NOTIFICATION_EVENTS_CHANGED, onChanged);
  }, [refresh]);

  useEffect(() => {
    if (open) {
      refresh();
      setConfirmClear(false);
      setMenuOpen(false);
      requestAnimationFrame(() => {
        bodyRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      });
    }
  }, [open, refresh]);

  const filtered = useMemo(
    () =>
      events.filter((event) => inboxMatchesFilter(event, filter, sourceFilter)),
    [events, filter, sourceFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationEvent[]>();
    for (const event of filtered) {
      const label = groupLabel(event.createdAt);
      const bucket = map.get(label) ?? [];
      bucket.push(event);
      map.set(label, bucket);
    }
    const order: Array<"Today" | "Yesterday" | "Earlier"> = [
      "Today",
      "Yesterday",
      "Earlier",
    ];
    return order
      .filter((label) => map.has(label))
      .map((label) => ({ label, items: map.get(label)! }));
  }, [filtered]);

  const unreadCount = events.filter((event) => !event.readAt).length;

  const handleActivate = async (event: NotificationEvent) => {
    await markActionInboxItemRead(event);
    refresh();
    await openNotificationTarget(event.target, {
      onOpenPerson,
      onOpenSettings,
      loadPreferences,
    });
    if (event.target?.kind !== "jira") {
      onClose();
    }
  };

  const handlePersonClick = (
    event: NotificationEvent,
    personId: string,
    clickEvent: React.MouseEvent,
  ) => {
    clickEvent.stopPropagation();
    void markActionInboxItemRead(event).then(() => refresh());
    onOpenPerson(personId);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Notifications"
      size="notification"
      className="drawer--notifications"
      header={
        <div className="notification-center__header">
          <div className="notification-center__header-row">
            <h2 className="notification-center__title">Notifications</h2>
            <div className="notification-center__header-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={unreadCount === 0}
                onClick={() => {
                  void markAllActionInboxItemsRead().then(() => refresh());
                }}
              >
                Mark all as read
              </Button>
              <div className="notification-center__menu-wrap">
                <IconButton
                  label="Notification options"
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  <MoreHorizontal size={16} strokeWidth={1.75} />
                </IconButton>
                {menuOpen ? (
                  <div className="notification-center__menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="notification-center__menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmClear(true);
                      }}
                    >
                      Clear notifications
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div ref={bodyRef} className="notification-center__body">
        <SegmentedControl
          ariaLabel="Notification filters"
          value={filter}
          options={FILTER_OPTIONS}
          onChange={setFilter}
        />
        <SegmentedControl
          ariaLabel="Notification source filter"
          value={sourceFilter}
          options={SOURCE_FILTER_OPTIONS}
          onChange={setSourceFilter}
        />
        {confirmClear ? (
          <div className="notification-center__confirm" role="alertdialog" aria-label="Clear notifications">
            <p className="notification-center__confirm-text">
              Clear all notification history? This cannot be undone.
            </p>
            <div className="notification-center__confirm-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  clearNotificationHistory();
                  refresh();
                  setConfirmClear(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="notification-center__error">
            <p>Couldn&apos;t load notification history.</p>
            <Button type="button" variant="secondary" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="notification-center__empty">
            <CircleAlert size={20} strokeWidth={1.75} aria-hidden />
            <p className="notification-center__empty-title">{emptyMessage(filter, sourceFilter)}</p>
            {filter === "all" && sourceFilter === "all" ? (
              <p className="notification-center__empty-copy">
                Important workload, task, and availability changes will appear here.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="notification-center__groups">
            {grouped.map((group) => (
              <section key={group.label} className="notification-center__group">
                <h3 className="notification-center__group-label">{group.label}</h3>
                <ul className="notification-center__list">
                  {group.items.map((event) => {
                    const item = enrichInboxEvent(event);
                    const Icon = eventIcon(event.type);
                    const unread = !event.readAt;
                    const showAvatar =
                      Boolean(event.personId && event.personName) &&
                      event.type !== "task_attention";
                    const itemClass = unread
                      ? "notification-center__item is-unread"
                      : "notification-center__item";
                    const iconEl = (
                      <span
                        className={`notification-center__icon notification-center__icon--${event.severity ?? "info"}`}
                        aria-hidden
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </span>
                    );
                    const avatarEl =
                      showAvatar && event.personId && event.personName ? (
                        <PersonAvatar
                          employeeId={event.personId}
                          displayName={event.personName}
                          size="sm"
                        />
                      ) : null;
                    const timeEl = (
                      <time
                        className="notification-center__item-time"
                        dateTime={event.createdAt}
                        title={formatNotificationExactTime(event.createdAt)}
                      >
                        {formatNotificationRelativeTime(event.createdAt)}
                      </time>
                    );
                    const sourceEl = (
                      <span className="notification-center__item-source">
                        {inboxSourceLabel(item.source)}
                      </span>
                    );
                    const actionEl = event.target ? (
                      <span className="notification-center__item-action">
                        {inboxActionLabel(event)}
                      </span>
                    ) : null;
                    const isTaskWithPersonLink =
                      event.type === "task_attention" &&
                      Boolean(event.personId && event.personName);

                    if (isTaskWithPersonLink) {
                      return (
                        <li key={event.id}>
                          <div className={itemClass}>
                            {iconEl}
                            <div className="notification-center__content">
                              <button
                                type="button"
                                className="notification-center__item-main"
                                onClick={() => void handleActivate(event)}
                              >
                                {sourceEl}
                                <span className="notification-center__item-title">{event.title}</span>
                                <span className="notification-center__item-message">{event.message}</span>
                                <span className="notification-center__item-meta">
                                  {timeEl}
                                  {actionEl}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="notification-center__person-link"
                                onClick={(clickEvent) =>
                                  handlePersonClick(event, event.personId!, clickEvent)
                                }
                              >
                                {event.personName}
                              </button>
                            </div>
                            {unread ? (
                              <span className="notification-center__unread-dot" aria-hidden />
                            ) : null}
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          className={itemClass}
                          onClick={() => void handleActivate(event)}
                        >
                          {iconEl}
                          {avatarEl}
                          <span className="notification-center__content">
                            {sourceEl}
                            <span className="notification-center__item-title">{event.title}</span>
                            <span className="notification-center__item-message">{event.message}</span>
                            <span className="notification-center__item-meta">
                              {timeEl}
                              {actionEl}
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
              </section>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

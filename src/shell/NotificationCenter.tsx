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
import { Drawer } from "../components/Drawer/Drawer";
import { Button } from "../components/Button/Button";
import { IconButton } from "../components/IconButton/IconButton";
import { PersonAvatar } from "../components/PersonAvatar/PersonAvatar";
import { SegmentedControl } from "../components/SegmentedControl/SegmentedControl";
import { enrichInboxEvent } from "../domain/inbox/actionInboxModel";
import { notificationActionLabel } from "../platform/notificationActionLabel";
import { loadPreferences } from "../platform/preferences";
import { openNotificationTarget } from "../platform/notificationNavigation";
import {
  formatNotificationExactTime,
  formatNotificationRelativeTime,
} from "../platform/notificationRelativeTime";
import type { NotificationEvent } from "../platform/notificationTypes";
import type { InboxSourceFilterId } from "../platform/notificationTypes";
import {
  emptyNotificationsMessage,
  filterNotificationsBySource,
  groupNotificationsForInbox,
} from "../platform/notificationInboxDisplay";
import {
  countUnreadNotificationEvents,
  listNotificationEventsOrThrow,
  NOTIFICATION_EVENTS_CHANGED,
} from "../platform/notificationEvents";
import { JiraIssueText } from "../components/JiraIssueLink/JiraIssueText";
import {
  clearActionInboxHistory,
  markActionInboxItemRead,
  markAllActionInboxItemsRead,
} from "../platform/inboxReadSync";
import type { SettingsSection } from "../pages/settings/types";
import type { OrgFeatureAccess } from "../domain/organization/orgFeatureAccess";
import { EmptyState } from "../components/EmptyState/EmptyState";
import "./notification-center.css";

const SOURCE_FILTER_OPTIONS: { value: InboxSourceFilterId; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "jira", label: "Jira" },
  { value: "bamboo", label: "BambooHR" },
  { value: "feedback", label: "Feedback" },
  { value: "metrio", label: "Metrio" },
];

function inboxSourceLabel(source: string): string {
  switch (source) {
    case "jira":
      return "JIRA";
    case "bamboo":
      return "BAMBOO";
    case "feedback":
      return "FEEDBACK";
    default:
      return "METRIO";
  }
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

export interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onOpenPerson: (personId: string) => void;
  onOpenSettings: (section: SettingsSection) => void;
  onUnreadChange?: (count: number) => void;
  orgFeatureAccess?: OrgFeatureAccess;
}

export function NotificationCenter({
  open,
  onClose,
  onOpenPerson,
  onOpenSettings,
  onUnreadChange,
  orgFeatureAccess,
}: NotificationCenterProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<InboxSourceFilterId>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const syncUnread = useCallback(
    (_next: NotificationEvent[]) => {
      onUnreadChange?.(countUnreadNotificationEvents());
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

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const filtered = useMemo(
    () => filterNotificationsBySource(events, sourceFilter),
    [events, sourceFilter],
  );

  const grouped = useMemo(
    () => groupNotificationsForInbox(filtered),
    [filtered],
  );

  const unreadCount = countUnreadNotificationEvents();
  const hasNotifications = events.length > 0;

  const handleActivate = async (event: NotificationEvent) => {
    await markActionInboxItemRead(event);
    refresh();
    await openNotificationTarget(event.target, {
      onOpenPerson,
      onOpenSettings,
      loadPreferences,
      orgFeatureAccess,
    });
    if (event.target?.kind !== "jira") {
      onClose();
    }
  };

  const renderLeadingVisual = (event: NotificationEvent) => {
    const personWorkload =
      (event.type === "workload_change" || event.type === "availability_change") &&
      event.personId &&
      event.personName;
    if (personWorkload) {
      return (
        <PersonAvatar
          personId={event.personId!}
          displayName={event.personName!}
          size="sm"
        />
      );
    }
    const Icon = eventIcon(event.type);
    return (
      <span
        className={`notification-center__icon notification-center__icon--${event.severity ?? "info"}`}
        aria-hidden
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Notifications"
      size="notification"
      className="drawer--notifications"
      header={<h2 className="notification-center__title">Notifications</h2>}
      headerActions={
        <div className="notification-center__header-actions" ref={menuRef}>
          <IconButton
            label="Notification options"
            data-testid="notification-overflow"
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
                disabled={unreadCount === 0}
                onClick={() => {
                  setMenuOpen(false);
                  void markAllActionInboxItemsRead().then(() => refresh());
                }}
              >
                Mark all as read
              </button>
              <button
                type="button"
                role="menuitem"
                className="notification-center__menu-item"
                disabled={!hasNotifications}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmClear(true);
                }}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      }
    >
      <div ref={bodyRef} className="notification-center__body">
        <div className="notification-center__filters">
          <SegmentedControl
            ariaLabel="Notification source filter"
            value={sourceFilter}
            options={SOURCE_FILTER_OPTIONS}
            onChange={setSourceFilter}
          />
        </div>
        <div className="notification-center__main metrio-scroll metrio-scroll--hidden-thumb">
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
                  void clearActionInboxHistory().then(() => {
                    refresh();
                    setConfirmClear(false);
                  });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <EmptyState
            className="metrio-empty-state--drawer-panel notification-center__error"
            role="alert"
            icon={<CircleAlert size={24} strokeWidth={1.75} aria-hidden />}
            title="Couldn't load notification history."
            actions={
              <Button type="button" variant="secondary" onClick={refresh}>
                Retry
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            className="metrio-empty-state--drawer-panel notification-center__empty"
            icon={<CircleAlert size={24} strokeWidth={1.75} aria-hidden />}
            title={emptyNotificationsMessage(sourceFilter)}
            description={
              sourceFilter === "all"
                ? "Important workload, task, and availability changes will appear here."
                : undefined
            }
          />
        ) : (
          <div className="notification-center__groups">
            {grouped.map((group) => (
              <section key={group.label} className="notification-center__group">
                <h3 className="notification-center__group-label">{group.label}</h3>
                <ul className="notification-center__list">
                  {group.items.map((event) => {
                    const item = enrichInboxEvent(event);
                    const unread = !event.readAt;
                    const cardClass = unread
                      ? "notification-center__card is-unread"
                      : "notification-center__card";
                    const actionLabel = notificationActionLabel(event, event.target);
                    const resolvedInactive =
                      Boolean(item.resolvedAt) &&
                      item.type === "integration_problem";

                    return (
                      <li key={event.id}>
                        <article
                          className={
                            resolvedInactive
                              ? `${cardClass} is-resolved`
                              : cardClass
                          }
                          data-testid="notification-card"
                        >
                          <div className="notification-center__card-top">
                            {renderLeadingVisual(event)}
                            <div className="notification-center__content">
                              <span className="notification-center__item-source">
                                {inboxSourceLabel(item.source)}
                              </span>
                              <span className="notification-center__item-title">
                                <JiraIssueText text={event.title} />
                              </span>
                              <span className="notification-center__item-message">
                                <JiraIssueText text={event.message} />
                              </span>
                              <time
                                className="notification-center__item-time"
                                dateTime={event.createdAt}
                                title={formatNotificationExactTime(event.createdAt)}
                              >
                                {formatNotificationRelativeTime(event.createdAt)}
                              </time>
                            </div>
                          </div>
                          {actionLabel ? (
                            <div className="notification-center__card-actions">
                              <Button
                                type="button"
                                variant="secondary"
                                className="notification-center__cta"
                                onClick={() => void handleActivate(event)}
                              >
                                {actionLabel}
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        </div>
      </div>
    </Drawer>
  );
}

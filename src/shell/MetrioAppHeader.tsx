import { Bell, Search, Settings2 } from "lucide-react";
import { IconButton } from "../components/IconButton/IconButton";
import type { AppRoute } from "../domain/types";
import type { Person } from "../domain/people/types";
import { ConnectionHealthBadge } from "./ConnectionHealthBadge";
import { ProfileMenu } from "./ProfileMenu";
import "./AppHeader.css";

const NAV_ITEMS: { route: AppRoute; label: string }[] = [
  { route: "home", label: "Dashboard" },
  { route: "performance", label: "Performance" },
  { route: "feedback", label: "Feedback" },
];

export interface MetrioAppHeaderProps {
  activeRoute: AppRoute | null;
  onNavigate: (route: AppRoute) => void;
  feedbackEnabled?: boolean;
  performanceEnabled?: boolean;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenCommandPalette?: () => void;
  notificationUnreadCount?: number;
  onOpenConnections?: () => void;
  onLogout?: () => void;
  headerPerson?: Person | null;
}

export function MetrioAppHeader({
  activeRoute,
  onNavigate,
  feedbackEnabled = true,
  performanceEnabled = true,
  onOpenSettings,
  onOpenNotifications,
  onOpenCommandPalette,
  notificationUnreadCount = 0,
  onOpenConnections,
  onLogout,
  headerPerson,
}: MetrioAppHeaderProps) {
  const navItems = NAV_ITEMS.filter(
    (item) => item.route !== "feedback" || feedbackEnabled,
  );

  return (
    <div className="app-header">
      <div className="app-header__start">
        <nav className="app-header__nav" aria-label="Main">
          {navItems.map((item) => {
            const active =
              activeRoute != null && item.route === activeRoute;
            const disabled =
              (item.route === "performance" && !performanceEnabled) ||
              (item.route === "feedback" && !feedbackEnabled);
            return (
              <button
                key={item.route}
                type="button"
                className={[
                  "app-header__nav-link",
                  active ? "is-active" : "",
                  disabled ? "is-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
                aria-disabled={disabled || undefined}
                disabled={disabled}
                tabIndex={disabled ? -1 : undefined}
                onClick={() => {
                  if (disabled) return;
                  onNavigate(item.route);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="app-header__actions">
        <div className="app-header__status-group">
          <ConnectionHealthBadge onOpenConnections={onOpenConnections} />
        </div>
        <div className="app-header__utility-group" aria-label="Utilities">
          <IconButton
            label="Search · ⌘K · ⌘F"
            onClick={onOpenCommandPalette}
          >
            <Search size={16} strokeWidth={1.7} />
          </IconButton>
          <span className="app-header__bell-wrap">
            <IconButton
              label={
                notificationUnreadCount > 0
                  ? `Notifications, ${notificationUnreadCount} unread`
                  : "Notifications"
              }
              onClick={onOpenNotifications}
            >
              <Bell size={16} strokeWidth={1.7} />
            </IconButton>
            {notificationUnreadCount > 0 ? (
              <span
                className={
                  notificationUnreadCount > 9
                    ? "app-header__bell-badge app-header__bell-badge--wide"
                    : "app-header__bell-badge"
                }
                data-testid="notification-unread-badge"
                aria-hidden
              >
                {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
              </span>
            ) : null}
          </span>
          <IconButton label="Settings" onClick={onOpenSettings}>
            <Settings2 size={16} strokeWidth={1.7} />
          </IconButton>
          <ProfileMenu
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
            person={headerPerson}
          />
        </div>
      </div>
    </div>
  );
}

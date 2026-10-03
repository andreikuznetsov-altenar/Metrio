import { Bell, Search, Settings2 } from "lucide-react";
import { IconButton } from "../components/IconButton/IconButton";
import type { AppRoute } from "../domain/types";
import { ConnectionHealthBadge } from "./ConnectionHealthBadge";
import { ProfileMenu } from "./ProfileMenu";
import "./AppHeader.css";

const NAV_ITEMS: { route: AppRoute; label: string }[] = [
  { route: "home", label: "Home" },
  { route: "performance", label: "Performance" },
  { route: "feedback", label: "Feedback" },
];

export interface MetrioAppHeaderProps {
  activeRoute: AppRoute | null;
  onNavigate: (route: AppRoute) => void;
  feedbackEnabled?: boolean;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenCommandPalette?: () => void;
  notificationUnreadCount?: number;
  onOpenConnections?: () => void;
  onLogout?: () => void;
}

export function MetrioAppHeader({
  activeRoute,
  onNavigate,
  feedbackEnabled = true,
  onOpenSettings,
  onOpenNotifications,
  onOpenCommandPalette,
  notificationUnreadCount = 0,
  onOpenConnections,
  onLogout,
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
            return (
              <button
                key={item.route}
                type="button"
                className={
                  active
                    ? "app-header__nav-link is-active"
                    : "app-header__nav-link"
                }
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.route)}
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
            label="Search · ⌘K"
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
              <span className="app-header__bell-badge" aria-hidden>
                {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
              </span>
            ) : null}
          </span>
          <IconButton label="Settings" onClick={onOpenSettings}>
            <Settings2 size={16} strokeWidth={1.7} />
          </IconButton>
          <ProfileMenu onOpenSettings={onOpenSettings} onLogout={onLogout} />
        </div>
      </div>
    </div>
  );
}

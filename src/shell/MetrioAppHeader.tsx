import { IconButton } from "../components/IconButton/IconButton";
import type { AppRoute } from "../domain/types";
import { ConnectionHealthBadge } from "./ConnectionHealthBadge";
import { ProfileMenu } from "./ProfileMenu";
import "./AppHeader.css";

const NAV_ITEMS: { route: AppRoute; label: string }[] = [
  { route: "performance", label: "Performance" },
  { route: "feedback", label: "Feedback" },
];

export interface MetrioAppHeaderProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  feedbackEnabled?: boolean;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenConnections?: () => void;
  onLogout?: () => void;
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.5 8.8c0-.2.1-.4.3-.5l.8-.5a.6.6 0 0 0 .2-.8l-.8-1.3a.6.6 0 0 0-.7-.3l-.9.3a2.2 2.2 0 0 0-.5-.3V5.2a.6.6 0 0 0-.5-.6l-1.5-.2a.6.6 0 0 0-.6.5l-.1 1a2.2 2.2 0 0 0-.5.3l-.9-.3a.6.6 0 0 0-.7.3l-.8 1.3c-.1.2-.1.5.2.8l.8.5c0 .2 0 .3-.1.5l-.8.5a.6.6 0 0 0-.2.8l.8 1.3c.2.3.5.4.8.3l.9-.3c.2.1.3.2.5.3v.9c0 .3.2.5.5.6l1.5.2c.3 0 .6-.2.6-.5l.1-1c.2-.1.4-.2.5-.3l.9.3c.3.1.6 0 .7-.3l.8-1.3c.1-.2.1-.5-.2-.8l-.8-.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5a3.5 3.5 0 0 0-3.5 3.5v2.1l-.9 1.4h8.8l-.9-1.4V6A3.5 3.5 0 0 0 8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 12.5h2.4M8 12.5V14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MetrioAppHeader({
  activeRoute,
  onNavigate,
  feedbackEnabled = true,
  onOpenSettings,
  onOpenNotifications,
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
            const active = item.route === activeRoute;
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
        <ConnectionHealthBadge onOpenConnections={onOpenConnections} />
        <IconButton label="Settings" onClick={onOpenSettings}>
          <SettingsIcon />
        </IconButton>
        <IconButton
          label="Notification settings"
          onClick={onOpenNotifications}
        >
          <BellIcon />
        </IconButton>
        <ProfileMenu onOpenSettings={onOpenSettings} onLogout={onLogout} />
      </div>
    </div>
  );
}

import { Bell, Settings } from "lucide-react";
import { IconButton } from "../components/ui/IconButton";
import "./AppHeader.css";

export type DemoSection = "performance" | "feedback";

export interface AppHeaderProps {
  activeSection: DemoSection;
  onSectionChange: (section: DemoSection) => void;
}

const NAV: { id: DemoSection; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "feedback", label: "Feedback" },
];

export function AppHeader({ activeSection, onSectionChange }: AppHeaderProps) {
  return (
    <div className="app-header">
      <p className="app-header__brand">Metrio</p>

      <nav className="app-header__nav" aria-label="Primary">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="app-header__nav-btn"
            aria-current={activeSection === item.id ? "page" : undefined}
            onClick={() => onSectionChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="app-header__actions">
        <IconButton label="Settings">
          <Settings size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Notifications">
          <Bell size={16} strokeWidth={1.75} />
        </IconButton>
        <span className="app-header__avatar" aria-hidden>
          AK
        </span>
      </div>
    </div>
  );
}

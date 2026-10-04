import { Bell, Settings } from "lucide-react";
import { IconButton } from "../components/IconButton/IconButton";
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
    <div className="foundation-header">
      <p className="foundation-header__brand">Metrio</p>

      <nav className="foundation-header__nav" aria-label="Primary">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className="foundation-header__nav-btn"
            aria-current={activeSection === item.id ? "page" : undefined}
            onClick={() => onSectionChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="foundation-header__actions">
        <IconButton label="Settings">
          <Settings size={16} strokeWidth={1.75} />
        </IconButton>
        <IconButton label="Notifications">
          <Bell size={16} strokeWidth={1.75} />
        </IconButton>
        <span className="foundation-header__avatar" aria-hidden>
          AK
        </span>
      </div>
    </div>
  );
}

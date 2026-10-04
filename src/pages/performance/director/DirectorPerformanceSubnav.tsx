import type { DirectorPerformanceView } from "../../../domain/performance";

const ITEMS: { id: DirectorPerformanceView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "teams", label: "Teams" },
  { id: "signals", label: "Signals" },
  { id: "delivery", label: "Delivery" },
];

export interface DirectorPerformanceSubnavProps {
  activeView: DirectorPerformanceView;
  onChange: (view: DirectorPerformanceView) => void;
}

export function DirectorPerformanceSubnav({
  activeView,
  onChange,
}: DirectorPerformanceSubnavProps) {
  return (
    <nav className="performance-subnav" aria-label="Director performance views">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            activeView === item.id
              ? "performance-subnav__link is-active"
              : "performance-subnav__link"
          }
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

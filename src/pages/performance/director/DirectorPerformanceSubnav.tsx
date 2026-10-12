import type { DirectorPerformanceView } from "../../../domain/performance";
import { PageSubnav } from "../../../shell/PageSubnav";

const ITEMS: { id: DirectorPerformanceView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "teams", label: "Teams" },
  { id: "people", label: "People" },
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
    <PageSubnav
      items={ITEMS}
      activeId={activeView}
      onChange={onChange}
      ariaLabel="Director performance views"
    />
  );
}

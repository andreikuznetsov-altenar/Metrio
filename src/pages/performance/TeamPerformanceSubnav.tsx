import type { TeamPerformanceView } from "../../domain/performance";
import { PageSubnav } from "../../shell/PageSubnav";

const ITEMS: { id: TeamPerformanceView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People" },
  { id: "radar", label: "Radar" },
  { id: "delivery-risk", label: "Delivery Risk" },
  { id: "goals", label: "Goals" },
  { id: "history-reports", label: "History reports" },
];

export interface TeamPerformanceSubnavProps {
  activeView: TeamPerformanceView;
  onChange: (view: TeamPerformanceView) => void;
}

export function TeamPerformanceSubnav({
  activeView,
  onChange,
}: TeamPerformanceSubnavProps) {
  return (
    <PageSubnav
      items={ITEMS}
      activeId={activeView}
      onChange={onChange}
      ariaLabel="Team performance views"
    />
  );
}

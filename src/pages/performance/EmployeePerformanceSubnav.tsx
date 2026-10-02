import type { EmployeePerformanceView } from "../../domain/performance";
import { PageSubnav } from "../../shell/PageSubnav";

const ITEMS: { id: EmployeePerformanceView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "my-week", label: "My Week" },
  { id: "goals", label: "Goals" },
  { id: "trends", label: "Trends" },
  { id: "work-history", label: "Work History" },
];

export interface EmployeePerformanceSubnavProps {
  activeView: EmployeePerformanceView;
  onChange: (view: EmployeePerformanceView) => void;
}

export function EmployeePerformanceSubnav({
  activeView,
  onChange,
}: EmployeePerformanceSubnavProps) {
  return (
    <PageSubnav
      items={ITEMS}
      activeId={activeView}
      onChange={onChange}
      ariaLabel="Personal performance views"
    />
  );
}

import { useWorkGraph } from "../../app/WorkGraphContext";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";
import { PersonWorkRow } from "./PersonWorkRow";

export function EmployeeCurrentWorkList({ rows }: { rows: PersonWorkRowData[] }) {
  const graph = useWorkGraph();
  return (
    <div className="performance-work-list">
      {rows.map((item) => (
        <PersonWorkRow
          key={item.key}
          item={item}
          knowledgeLinks={graph.knowledgeByIssue.get(item.key)}
        />
      ))}
    </div>
  );
}

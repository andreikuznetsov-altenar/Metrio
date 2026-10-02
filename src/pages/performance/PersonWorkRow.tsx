import { Badge } from "../../components/Badge/Badge";
import type { PersonWorkRowData } from "../../domain/analytics/personAnalyticsWorkspace";

export interface PersonWorkRowProps {
  item: PersonWorkRowData;
}

export function PersonWorkRow({ item }: PersonWorkRowProps) {
  return (
    <div className="performance-work-row performance-work-row--drawer">
      <div className="performance-work-row__key">{item.key}</div>
      <div className="performance-work-row__main">
        <div className="performance-work-row__title performance-work-row__title--wrap">
          {item.title}
        </div>
        <div className="performance-work-row__meta">
          <Badge variant="neutral">{item.status}</Badge>
          <span aria-hidden>·</span>
          <span>{item.stageAge} in stage</span>
        </div>
      </div>
      <Badge variant={item.healthVariant} className="person-work-row__health">
        {item.healthVariant === "danger"
          ? "Problematic"
          : item.healthVariant === "warning"
            ? "At risk"
            : "Active"}
      </Badge>
    </div>
  );
}

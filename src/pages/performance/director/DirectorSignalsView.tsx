import type { OrganizationSignal } from "../../../domain/organization/organizationTypes";
import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";

export interface DirectorSignalsViewProps {
  signals: OrganizationSignal[];
  onOpen: (signal: OrganizationSignal) => void;
}

export function DirectorSignalsView({ signals, onOpen }: DirectorSignalsViewProps) {
  if (!signals.length) {
    return (
      <p className="performance-inline-empty" data-testid="director-signals-empty">
        No high-priority organization signals in this period.
      </p>
    );
  }

  return (
    <ul className="performance-director-signals" data-testid="director-signals">
      {signals.map((signal) => (
        <li key={signal.id}>
          <Badge variant={signal.severity === "info" ? "neutral" : "warning"}>
            {signal.severity}
          </Badge>
          <div>
            <div>{signal.title}</div>
            <div className="performance-inline-empty">{signal.description}</div>
          </div>
          <Button variant="ghost" onClick={() => onOpen(signal)}>
            Open
          </Button>
        </li>
      ))}
    </ul>
  );
}

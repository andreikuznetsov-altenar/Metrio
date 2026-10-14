import type { OrganizationSignal } from "../../../domain/organization/organizationTypes";
import { Badge } from "../../../components/Badge/Badge";
import { Button } from "../../../components/Button/Button";
import { ScopeStrip } from "../../../components/ScopeStrip/ScopeStrip";

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
    <ul className="performance-scope-strip-list" data-testid="director-signals">
      {signals.map((signal) => (
        <li key={signal.id}>
          <ScopeStrip
            ariaLabel={signal.title}
            leading={
              <Badge variant={signal.severity === "info" ? "neutral" : "warning"}>
                {signal.severity}
              </Badge>
            }
            title={signal.title}
            description={signal.description}
            action={
              <Button variant="secondary" size="small" onClick={() => onOpen(signal)}>
                Open
              </Button>
            }
          />
        </li>
      ))}
    </ul>
  );
}

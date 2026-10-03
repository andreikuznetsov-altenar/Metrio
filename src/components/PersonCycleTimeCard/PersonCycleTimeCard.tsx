import { Card } from "../Card/Card";
import { HelpIcon } from "../HelpIcon/HelpIcon";
import "../../pages/performance/action-queue.css";

const CYCLE_HELP =
  "Average segment durations for active cycles: Progress → Review (P → R) and Review → Done (R → D).";

export interface PersonCycleTimeCardProps {
  segments: { label: string; value: string }[];
  className?: string;
}

export function PersonCycleTimeCard({
  segments,
  className,
}: PersonCycleTimeCardProps) {
  if (!segments.length) return null;

  return (
    <Card className={["person-cycle-time-card", className].filter(Boolean).join(" ")}>
      <div className="person-cycle-time-card__head">
        <span className="person-cycle-time-card__title">Cycle time</span>
        <HelpIcon label={CYCLE_HELP} />
      </div>
      <dl className="person-cycle-time-card__segments">
        {segments.map((segment) => (
          <div key={segment.label} className="person-cycle-time-card__row">
            <dt>{segment.label}</dt>
            <dd>{segment.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

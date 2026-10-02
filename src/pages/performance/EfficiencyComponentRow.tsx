import "./efficiency-component-row.css";

export interface EfficiencyComponentRowProps {
  label: string;
  points: string;
  detail: string;
  isPenalty?: boolean;
}

export function EfficiencyComponentRow({
  label,
  points,
  detail,
  isPenalty = false,
}: EfficiencyComponentRowProps) {
  return (
    <div className="efficiency-component-row">
      <div className="efficiency-component-row__primary">
        <span className="efficiency-component-row__label">{label}</span>
        <span
          className={
            isPenalty
              ? "efficiency-component-row__points efficiency-component-row__points--penalty"
              : "efficiency-component-row__points"
          }
        >
          {points}
        </span>
      </div>
      <p className="efficiency-component-row__detail">{detail}</p>
    </div>
  );
}

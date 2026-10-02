import { Info } from "lucide-react";
import { Tooltip } from "../Tooltip/Tooltip";
import "./HelpIcon.css";

export interface HelpIconProps {
  label: string;
  className?: string;
}

export function HelpIcon({ label, className }: HelpIconProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        className={["help-icon", className].filter(Boolean).join(" ")}
        aria-label={label}
      >
        <Info size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </Tooltip>
  );
}

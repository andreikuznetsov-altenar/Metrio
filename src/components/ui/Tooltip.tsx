import type { ReactElement, ReactNode } from "react";
import { Tooltip as AppTooltip } from "../Tooltip/Tooltip";

export interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <AppTooltip content={content}>
      <span className="ui-tooltip-wrap">{children as ReactElement}</span>
    </AppTooltip>
  );
}

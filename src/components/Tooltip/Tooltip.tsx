import type { ReactElement, ReactNode } from "react";
import "./Tooltip.css";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="tooltip">
      <span className="tooltip__trigger" tabIndex={0}>
        {children}
      </span>
      <span role="tooltip" className="tooltip__content">
        {content}
      </span>
    </span>
  );
}

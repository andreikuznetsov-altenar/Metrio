import type { ReactNode } from "react";
import { HelpIcon } from "../HelpIcon/HelpIcon";
import "./SectionTitle.css";

export interface SectionTitleProps {
  title: string;
  help?: string;
  actions?: ReactNode;
  inline?: boolean;
}

export function SectionTitle({ title, help, actions, inline }: SectionTitleProps) {
  return (
    <div
      className={
        inline
          ? "performance-section-head section-title section-title--inline"
          : "section-title"
      }
    >
      <h3 className="performance-section__title performance-section__title--inline section-title__heading">
        {title}
        {help ? <HelpIcon label={help} className="section-title__help" /> : null}
      </h3>
      {actions}
    </div>
  );
}

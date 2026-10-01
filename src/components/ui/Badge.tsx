import type { ReactNode } from "react";
import "./ui.css";

export type BadgeTone = "neutral" | "accent" | "success";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const className =
    tone === "neutral" ? "ui-badge" : `ui-badge ui-badge--${tone}`;
  return <span className={className}>{children}</span>;
}

import type { ReactNode } from "react";
import "./InfoBlock.css";

export interface InfoBlockProps {
  children: ReactNode;
  className?: string;
  testId?: string;
}

/** Important contextual information (subtle accent surface; not a warning or error). */
export function InfoBlock({ children, className, testId }: InfoBlockProps) {
  return (
    <div
      className={["info-block", className].filter(Boolean).join(" ")}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

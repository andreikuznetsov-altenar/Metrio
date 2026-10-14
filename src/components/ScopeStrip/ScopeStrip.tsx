import type { ReactNode } from "react";
import "./ScopeStrip.css";

export interface ScopeStripProps {
  eyebrow?: string;
  title: ReactNode;
  /** Secondary line under the title (e.g. a signal's context). */
  description?: ReactNode;
  /** Optional leading element, e.g. a severity badge. */
  leading?: ReactNode;
  /** Optional right-aligned action (vertically centred). */
  action?: ReactNode;
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * The compact bounded information strip used by PERFORMANCE SCOPE, Signals and the project panel
 * summary: same surface, border, radius, padding and text hierarchy everywhere.
 */
export function ScopeStrip({
  eyebrow,
  title,
  description,
  leading,
  action,
  ariaLabel,
  className,
  "data-testid": testId,
}: ScopeStripProps) {
  return (
    <section
      className={["performance-scope-strip", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel ?? eyebrow}
      data-testid={testId}
    >
      {leading ? <div className="performance-scope-strip__leading">{leading}</div> : null}
      <div className="performance-scope-strip__body">
        {eyebrow ? <p className="performance-scope-strip__eyebrow">{eyebrow}</p> : null}
        <h3 className="performance-scope-strip__title">{title}</h3>
        {description ? (
          <p className="performance-scope-strip__description">{description}</p>
        ) : null}
      </div>
      {action ? <div className="performance-scope-strip__action">{action}</div> : null}
    </section>
  );
}

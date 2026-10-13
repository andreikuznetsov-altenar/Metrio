import type { ReactNode } from "react";
import "./MetaList.css";

export interface MetaListProps {
  children: ReactNode;
  className?: string;
  testId?: string;
  ariaLabel?: string;
}

/** Bounded key/value rows (label left, value in a fixed second column). */
export function MetaList({ children, className, testId, ariaLabel }: MetaListProps) {
  return (
    <dl
      className={["meta-list", className].filter(Boolean).join(" ")}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {children}
    </dl>
  );
}

export interface MetaRowProps {
  label: string;
  children: ReactNode;
  testId?: string;
}

export function MetaRow({ label, children, testId }: MetaRowProps) {
  return (
    <div className="meta-list__row" data-testid={testId}>
      <dt className="meta-list__label">{label}</dt>
      <dd className="meta-list__value">{children}</dd>
    </div>
  );
}

import type { ReactNode } from "react";
import "./AppShell.css";

export interface AppShellProps {
  header: ReactNode;
  pageToolbar?: ReactNode;
  /** @deprecated Use pageToolbar */
  pageHeader?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  header,
  pageToolbar,
  pageHeader,
  footer,
  children,
}: AppShellProps) {
  const toolbar = pageToolbar ?? pageHeader;

  return (
    <div
      className={[
        "app-shell",
        toolbar ? "app-shell--page-toolbar" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="app-shell"
    >
      <header className="app-shell__header">{header}</header>
      {toolbar ? (
        <div className="app-shell__page-toolbar">{toolbar}</div>
      ) : null}
      <main className="app-shell__viewport" id="app-content-surface" data-testid="app-content-surface">
        {children}
      </main>
      {footer ? <footer className="app-shell__footer">{footer}</footer> : null}
    </div>
  );
}

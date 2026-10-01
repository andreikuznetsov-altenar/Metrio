import type { ReactNode } from "react";
import "./AppShell.css";

export interface AppShellProps {
  header: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function AppShell({ header, toolbar, footer, children }: AppShellProps) {
  return (
    <div className="app-shell" data-testid="app-shell">
      <header className="app-shell__header">{header}</header>
      {toolbar ? <div className="app-shell__toolbar">{toolbar}</div> : null}
      <main className="app-shell__viewport">{children}</main>
      {footer ? <footer className="app-shell__footer">{footer}</footer> : null}
    </div>
  );
}

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
    <div className="foundation-shell" data-testid="foundation-shell">
      <header className="foundation-shell__header">{header}</header>
      {toolbar ? <div className="foundation-shell__toolbar">{toolbar}</div> : null}
      <main className="foundation-shell__viewport">{children}</main>
      {footer ? <footer className="foundation-shell__footer">{footer}</footer> : null}
    </div>
  );
}

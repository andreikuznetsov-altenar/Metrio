import type { ReactNode } from "react";
import { APP_DRAWER_LAYER_ID } from "../Drawer/drawerPortal";
import { APP_MODAL_LAYER_ID } from "../Modal/modalPortal";
import { APP_TOOLTIP_LAYER_ID } from "../Tooltip/tooltipPortal";
import { GlobalRefreshStatusPanel } from "../GlobalRefreshStatusPanel/GlobalRefreshStatusPanel";
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
      <div
        className="app-refresh-status-layer"
        data-testid="app-refresh-status-layer"
      >
        <GlobalRefreshStatusPanel />
      </div>
      <div
        id={APP_DRAWER_LAYER_ID}
        className="app-drawer-layer"
        data-testid="app-drawer-layer"
      />
      <div
        id={APP_MODAL_LAYER_ID}
        className="app-modal-layer"
        data-testid="app-modal-layer"
      />
      <div
        id={APP_TOOLTIP_LAYER_ID}
        className="app-tooltip-layer"
        data-testid="app-tooltip-layer"
      />
    </div>
  );
}

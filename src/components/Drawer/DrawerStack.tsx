import { useEffect, useId, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import type { DrawerSize } from "./Drawer";
import { useDrawerSurfaceLifecycle } from "./useDrawerSurfaceLifecycle";
import { portalDrawerSurface } from "./drawerPortal";
import "./Drawer.css";

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4 4 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type DrawerStackPanel = "primary" | "secondary";

export interface DrawerStackProps {
  open: boolean;
  activePanel: DrawerStackPanel;
  onClose: () => void;
  onClosed?: () => void;
  onBack?: () => void;
  ariaLabel: string;
  header?: ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  size?: DrawerSize;
  className?: string;
  testId?: string;
}

const DRAWER_SIZE_CLASS: Record<DrawerSize, string | undefined> = {
  default: undefined,
  notification: "drawer--notification",
  person: "drawer--person",
  analytics: "drawer--analytics",
};

export function DrawerStack({
  open,
  activePanel,
  onClose,
  onClosed,
  onBack,
  ariaLabel,
  header,
  headerActions,
  footer,
  children,
  size = "default",
  className,
  testId,
}: DrawerStackProps) {
  const titleId = useId();
  const { mounted, phase, panelRef, backdropRef } = useDrawerSurfaceLifecycle(open, onClosed);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (activePanel === "secondary" && onBack) {
          onBack();
          return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activePanel, onBack, onClose, open]);

  if (!mounted) {
    return null;
  }

  const panelClass =
    activePanel === "secondary"
      ? "drawer-stack-panel drawer-stack-panel--secondary"
      : "drawer-stack-panel drawer-stack-panel--primary";

  return portalDrawerSurface(
    <div
      className="drawer-root drawer-root--stack is-visible"
      data-drawer-panel={activePanel}
      data-drawer-phase={phase}
      data-testid={testId}
    >
      <button
        ref={backdropRef}
        type="button"
        className="drawer-root__backdrop"
        aria-label="Close drawer"
        onClick={() => {
          if (activePanel === "secondary" && onBack) {
            onBack();
            return;
          }
          onClose();
        }}
      />
      <aside
        ref={panelRef}
        className={["drawer", DRAWER_SIZE_CLASS[size], panelClass, className]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
      >
        <div className="drawer__header" id={titleId}>
          <div className="drawer__header-main">{header}</div>
          <div className="drawer__header-toolbar">
            {headerActions}
            <IconButton
              label={activePanel === "secondary" ? "Close brief" : "Close drawer"}
              onClick={() => {
                if (activePanel === "secondary" && onBack) {
                  onBack();
                  return;
                }
                onClose();
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </div>
        <div className="drawer__body metrio-scroll metrio-scroll--hidden-thumb">
          {children}
        </div>
        {footer ? <div className="drawer__footer">{footer}</div> : null}
      </aside>
    </div>,
  );
}

import { useEffect, useId, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
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

export type DrawerSize = "default" | "notification" | "person" | "analytics";

const DRAWER_SIZE_CLASS: Record<DrawerSize, string | undefined> = {
  default: undefined,
  notification: "drawer--notification",
  person: "drawer--person",
  analytics: "drawer--analytics",
};

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  ariaLabel: string;
  header?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  size?: DrawerSize;
  className?: string;
  testId?: string;
}

export function Drawer({
  open,
  onClose,
  onClosed,
  ariaLabel,
  header,
  headerActions,
  children,
  size = "default",
  className,
  testId,
}: DrawerProps) {
  const titleId = useId();
  const { mounted, visible, phase, panelRef } = useDrawerSurfaceLifecycle(open, onClosed);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  return portalDrawerSurface(
    <div
      className={
        visible
          ? "drawer-root is-visible is-open"
          : "drawer-root is-visible"
      }
      data-drawer-phase={phase}
      data-testid={testId ? `${testId}-root` : undefined}
    >
      <button
        type="button"
        className="drawer-root__backdrop"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className={["drawer", DRAWER_SIZE_CLASS[size], className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <div className="drawer__header" id={titleId}>
          <div className="drawer__header-main">{header}</div>
          <div className="drawer__header-toolbar">
            {headerActions}
            <IconButton label="Close drawer" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>
        <div className="drawer__body metrio-scroll">{children}</div>
      </aside>
    </div>,
  );
}

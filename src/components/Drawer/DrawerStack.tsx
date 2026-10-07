import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import { readMotionDrawerCloseMs } from "../../styles/motion";
import type { DrawerSize } from "./Drawer";
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
  /** Close secondary panel and return to primary (back). */
  onBack?: () => void;
  ariaLabel: string;
  header?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  size?: DrawerSize;
  className?: string;
  testId?: string;
  /** When true, panel plays exit slide before unmounting stack. */
  animatingOut?: boolean;
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
  children,
  size = "default",
  className,
  testId,
  animatingOut = false,
}: DrawerStackProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const [panelMotionKey, setPanelMotionKey] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setPanelMotionKey((value) => value + 1);
  }, [activePanel, open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);
      const frame = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      frameRef.current = frame;
      return () => {
        if (frameRef.current != null) {
          window.cancelAnimationFrame(frameRef.current);
        }
      };
    }
    setVisible(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!mounted || open) {
      return;
    }
    const timer = window.setTimeout(() => {
      setMounted(false);
      onClosed?.();
    }, readMotionDrawerCloseMs());
    return () => window.clearTimeout(timer);
  }, [mounted, onClosed, open]);

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

  return (
    <div
      className={
        visible && !animatingOut
          ? "drawer-root drawer-root--stack is-visible is-open"
          : "drawer-root drawer-root--stack is-visible"
      }
      data-drawer-panel={activePanel}
      data-testid={testId}
    >
      <button
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
        key={panelMotionKey}
        className={[
          "drawer",
          DRAWER_SIZE_CLASS[size],
          panelClass,
          animatingOut ? "drawer-stack-panel--exit" : "",
          className,
        ]
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
        <div className="drawer__body metrio-scroll">{children}</div>
      </aside>
    </div>
  );
}

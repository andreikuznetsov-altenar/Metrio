import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
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

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  ariaLabel: string;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  onClosed,
  ariaLabel,
  header,
  children,
  className,
}: DrawerProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      frameRef.current = window.requestAnimationFrame(() => {
        setVisible(true);
      });
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
    }, 240);
    return () => window.clearTimeout(timer);
  }, [mounted, onClosed, open, visible]);

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

  return (
    <div
      className={visible ? "drawer-root is-visible is-open" : "drawer-root is-visible"}
    >
      <button
        type="button"
        className="drawer-root__backdrop"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className={["drawer", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
      >
        <div className="drawer__header" id={titleId}>
          {header}
          <IconButton label="Close drawer" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  );
}

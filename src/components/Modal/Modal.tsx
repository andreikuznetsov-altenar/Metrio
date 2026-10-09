import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import { readMotionModalMs } from "../../styles/motion";
import { portalModalSurface } from "./modalPortal";
import "./Modal.css";

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

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Accessible description id hook for aria-describedby when needed. */
  descriptionId?: string;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  descriptionId,
  className,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      let cancelled = false;
      let outerFrame = 0;
      let innerFrame = 0;
      setMounted(true);
      setVisible(false);
      outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => {
          frameRef.current = null;
          if (!cancelled) setVisible(true);
        });
        frameRef.current = innerFrame;
      });
      frameRef.current = outerFrame;
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(outerFrame);
        window.cancelAnimationFrame(innerFrame);
        frameRef.current = null;
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
    }, readMotionModalMs());
    return () => window.clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open, visible]);

  if (!mounted) return null;

  return portalModalSurface(
    <div
      className={
        visible ? "metrio-modal-root metrio-modal-root--open" : "metrio-modal-root"
      }
      data-open={open ? "true" : undefined}
      data-testid="metrio-modal-root"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="metrio-modal-root__backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={["metrio-modal", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <header className="metrio-modal__header">
          <h2 id={titleId} className="metrio-modal__title">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </header>
        <div className="metrio-modal__body metrio-scroll metrio-scroll--hidden-thumb">
          {children}
        </div>
      </div>
    </div>,
  );
}

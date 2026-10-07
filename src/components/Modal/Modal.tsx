import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import { readMotionModalMs } from "../../styles/motion";
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
    }, readMotionModalMs());
    return () => window.clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open, visible]);

  if (!mounted) return null;

  return (
    <div
      className={
        visible ? "metrio-modal-root metrio-modal-root--open" : "metrio-modal-root"
      }
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
        <div className="metrio-modal__body metrio-scroll">{children}</div>
      </div>
    </div>
  );
}

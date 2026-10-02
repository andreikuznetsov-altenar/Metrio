import { LoaderCircle } from "lucide-react";
import "./ContentLoadingOverlay.css";

export interface ContentLoadingOverlayProps {
  visible: boolean;
  label?: string;
  className?: string;
}

export function ContentLoadingOverlay({
  visible,
  label = "Loading performance data...",
  className,
}: ContentLoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={["content-loading-overlay", className].filter(Boolean).join(" ")}
      data-testid="performance-content-overlay"
      aria-hidden={false}
    >
      <div className="content-loading-overlay__inner">
        <LoaderCircle
          className="content-loading-overlay__icon content-loading-overlay__icon--spin"
          strokeWidth={1.75}
          aria-hidden
        />
        <p className="content-loading-overlay__label">{label}</p>
      </div>
    </div>
  );
}

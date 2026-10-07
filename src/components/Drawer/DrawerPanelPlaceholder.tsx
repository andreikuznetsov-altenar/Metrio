import type { ReactNode } from "react";

export interface DrawerPanelPlaceholderProps {
  icon?: ReactNode;
  title: string;
  copy?: string;
  actions?: ReactNode;
  role?: "status" | "alert";
  className?: string;
  compact?: boolean;
}

/** Centered empty state for drawer / side-panel bodies. */
export function DrawerPanelPlaceholder({
  icon,
  title,
  copy,
  actions,
  role = "status",
  className,
  compact = false,
}: DrawerPanelPlaceholderProps) {
  return (
    <div
      className={[
        "metrio-placeholder",
        "metrio-placeholder--drawer-panel",
        compact ? "metrio-placeholder--drawer-panel--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={role}
    >
      {icon ? <div className="metrio-placeholder__icon">{icon}</div> : null}
      <div className="metrio-placeholder__text">
        <p className="metrio-placeholder__title">{title}</p>
        {copy ? <p className="metrio-placeholder__copy">{copy}</p> : null}
      </div>
      {actions ? <div className="metrio-placeholder__actions">{actions}</div> : null}
    </div>
  );
}

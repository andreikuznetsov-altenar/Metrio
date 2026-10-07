import type { ReactNode } from "react";
import { EmptyState } from "../EmptyState/EmptyState";

export interface DrawerPanelPlaceholderProps {
  icon?: ReactNode;
  title: string;
  copy?: string;
  actions?: ReactNode;
  role?: "status" | "alert";
  className?: string;
  compact?: boolean;
}

/** Drawer-scoped empty state (canonical EmptyState + panel padding). */
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
    <EmptyState
      icon={icon}
      title={title}
      description={copy}
      actions={actions}
      role={role}
      compact={compact}
      className={["metrio-empty-state--drawer-panel", className].filter(Boolean).join(" ")}
    />
  );
}

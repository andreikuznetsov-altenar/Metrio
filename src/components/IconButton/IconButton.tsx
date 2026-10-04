import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./IconButton.css";

export type IconButtonSize = "default" | "compact";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: IconButtonSize;
}

export function IconButton({
  label,
  children,
  type = "button",
  size = "default",
  className,
  ...props
}: IconButtonProps) {
  const classes = ["icon-btn", size === "compact" ? "icon-btn--compact" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} aria-label={label} {...props}>
      {children}
    </button>
  );
}

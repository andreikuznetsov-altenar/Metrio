import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  const classes = ["ui-icon-btn", className].filter(Boolean).join(" ");

  return (
    <button type={type} className={classes} aria-label={label} {...props}>
      {children}
    </button>
  );
}

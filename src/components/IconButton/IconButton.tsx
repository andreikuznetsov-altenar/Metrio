import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./IconButton.css";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button type={type} className="icon-btn" aria-label={label} {...props}>
      {children}
    </button>
  );
}

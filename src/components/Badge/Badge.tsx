import type { HTMLAttributes } from "react";
import "./Badge.css";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  const classes = ["badge", `badge--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} {...props} />;
}

import type { ReactNode } from "react";
import "./ui.css";

export interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function ScrollArea({ children, className }: ScrollAreaProps) {
  const classes = [
    "ui-scroll-area",
    "metrio-scroll",
    "metrio-scroll--hidden-thumb",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}

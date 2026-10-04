import type { HTMLAttributes, ReactNode } from "react";
import "./ScrollArea.css";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  const classes = ["scroll-area", "metrio-scroll", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

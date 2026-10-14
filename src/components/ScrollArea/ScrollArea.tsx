import type { HTMLAttributes, ReactNode } from "react";
import { useSmoothScroll } from "../../platform/useSmoothScroll";
import "./ScrollArea.css";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  const classes = ["scroll-area", "metrio-scroll", className].filter(Boolean).join(" ");

  const ref = useSmoothScroll<HTMLDivElement>();

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
}

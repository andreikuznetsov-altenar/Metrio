import type { HTMLAttributes, ReactNode } from "react";
import { useSmoothWheelScroll } from "../../platform/useSmoothWheelScroll";
import "./ScrollArea.css";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  const classes = ["scroll-area", "metrio-scroll", className].filter(Boolean).join(" ");

  const ref = useSmoothWheelScroll<HTMLDivElement>();

  return (
    <div ref={ref} className={classes} {...props}>
      {children}
    </div>
  );
}

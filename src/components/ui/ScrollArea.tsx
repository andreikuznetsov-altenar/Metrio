import type { ReactNode } from "react";
import { useSmoothWheelScroll } from "../../platform/useSmoothWheelScroll";
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
  const ref = useSmoothWheelScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={classes}>{children}
    </div>
  );
}

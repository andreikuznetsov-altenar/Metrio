import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useLayoutEffect, useState, type ReactElement, type ReactNode } from "react";
import { getAppTooltipPortalRoot } from "./tooltipPortal";
import "./Tooltip.css";

/**
 * Gap between trigger and tooltip. There is no arrow: it was 6px with a 5px caret filling it, so the
 * tooltip now sits ~2px closer while keeping a small clear gap from the info icon.
 */
export const TOOLTIP_SIDE_OFFSET = 4;

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={0}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
}: TooltipProps) {
  const [container, setContainer] = useState<HTMLElement | undefined>();
  useLayoutEffect(() => {
    setContainer(getAppTooltipPortalRoot());
  }, []);

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal container={container}>
        <TooltipPrimitive.Content
          className="tooltip__content tooltip__content--radix"
          data-testid="metrio-tooltip"
          side={side}
          align={align}
          sideOffset={TOOLTIP_SIDE_OFFSET}
          collisionPadding={8}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

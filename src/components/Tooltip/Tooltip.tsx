import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useLayoutEffect, useState, type ReactElement, type ReactNode } from "react";
import { getAppTooltipPortalRoot } from "./tooltipPortal";
import "./Tooltip.css";

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
          sideOffset={6}
          collisionPadding={8}
        >
          {content}
          <TooltipPrimitive.Arrow className="tooltip__arrow" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

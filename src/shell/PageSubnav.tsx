import { useLayoutEffect, useRef, useState } from "react";
import "../pages/performance/performance-dashboard.css";

export interface PageSubnavItem<T extends string> {
  id: T;
  label: string;
}

export interface PageSubnavProps<T extends string> {
  items: PageSubnavItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}

export function PageSubnav<T extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
}: PageSubnavProps<T>) {
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>(".performance-subnav__link.is-active");
    if (!active) {
      setIndicator({ left: 0, width: 0 });
      return;
    }
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        const next = nav.querySelector<HTMLElement>(".performance-subnav__link.is-active");
        if (!next) return;
        setIndicator({ left: next.offsetLeft, width: next.offsetWidth });
      });
      observer.observe(nav);
      return () => observer.disconnect();
    }

    return undefined;
  }, [activeId, items]);

  return (
    <nav ref={navRef} className="performance-subnav" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            className={
              active
                ? "performance-subnav__link is-active"
                : "performance-subnav__link"
            }
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
      <span
        className="performance-subnav__indicator"
        aria-hidden
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
      />
    </nav>
  );
}

export function measureSubnavIndicator(
  activeLeft: number,
  activeWidth: number,
): { left: number; width: number } {
  return { left: activeLeft, width: activeWidth };
}

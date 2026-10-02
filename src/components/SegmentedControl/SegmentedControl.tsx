import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./SegmentedControl.css";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!active) {
      setIndicator({ left: 0, width: 0 });
      return;
    }
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const next = list.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!next) return;
      setIndicator({ left: next.offsetLeft, width: next.offsetWidth });
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <div
      ref={listRef}
      className="segmented-control"
      role="group"
      aria-label={ariaLabel}
    >
      <span
        className="segmented-control__indicator"
        aria-hidden
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={
              active
                ? "segmented-control__option is-active"
                : "segmented-control__option"
            }
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

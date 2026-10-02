import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./Tabs.css";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ items, defaultValue, value, onValueChange }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const initial = defaultValue ?? items[0]?.value ?? "";
  const [uncontrolledActive, setUncontrolledActive] = useState(initial);
  const active = value ?? uncontrolledActive;
  const setActive = (next: string) => {
    if (value == null) {
      setUncontrolledActive(next);
    }
    onValueChange?.(next);
  };
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeItem = items.find((item) => item.value === active) ?? items[0];

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!selected) {
      setIndicator({ left: 0, width: 0 });
      return;
    }
    setIndicator({ left: selected.offsetLeft, width: selected.offsetWidth });
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const next = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!next) return;
      setIndicator({ left: next.offsetLeft, width: next.offsetWidth });
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, items]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.value === active);
    if (index < 0) {
      return;
    }

    let nextIndex = index;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % enabled.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + enabled.length) % enabled.length;
    } else {
      return;
    }

    event.preventDefault();
    setActive(enabled[nextIndex].value);
  };

  return (
    <div className="tabs">
      <div
        ref={listRef}
        className="tabs__list"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        <span
          className="tabs__indicator"
          aria-hidden
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              className="tabs__trigger"
              disabled={item.disabled}
              onClick={() => setActive(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          className="tabs__panel"
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.value}`}
          aria-labelledby={`${baseId}-tab-${activeItem.value}`}
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}

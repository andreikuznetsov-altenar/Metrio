import {
  useId,
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
}

export function Tabs({ items, defaultValue }: TabsProps) {
  const baseId = useId();
  const initial = defaultValue ?? items[0]?.value ?? "";
  const [active, setActive] = useState(initial);
  const activeItem = items.find((item) => item.value === active) ?? items[0];

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
        className="tabs__list"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
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

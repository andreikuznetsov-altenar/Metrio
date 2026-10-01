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
  return (
    <nav className="performance-subnav" aria-label={ariaLabel}>
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
    </nav>
  );
}

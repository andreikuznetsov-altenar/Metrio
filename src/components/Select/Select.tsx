import type { SelectHTMLAttributes } from "react";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: boolean;
}

export function Select({
  label,
  options,
  id,
  className,
  error = false,
  ...props
}: SelectProps) {
  const selectId =
    id ?? (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const selectClass = ["select", error ? "select--error" : "", className]
    .filter(Boolean)
    .join(" ");

  const select = (
    <select id={selectId} className={selectClass} aria-invalid={error || undefined} {...props}>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <div className={error ? "select-wrap select-wrap--error" : "select-wrap"}>
      <label className="select-wrap__label" htmlFor={selectId}>
        {label}
      </label>
      {select}
    </div>
  );
}

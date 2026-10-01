import type { SelectHTMLAttributes } from "react";
import "./ui.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: boolean;
  options: SelectOption[];
}

export function Select({
  label,
  id,
  className,
  error = false,
  options,
  ...props
}: SelectProps) {
  const selectId =
    id ?? (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const selectClass = ["ui-select", error ? "ui-select--error" : "", className]
    .filter(Boolean)
    .join(" ");

  const select = (
    <select id={selectId} className={selectClass} aria-invalid={error || undefined} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <label className="ui-field" htmlFor={selectId}>
      <span className="ui-field__label">{label}</span>
      {select}
    </label>
  );
}

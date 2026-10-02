import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  error?: boolean;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  onChange?: (event: { target: { value: string } }) => void;
}

export function Select({
  label,
  options,
  id,
  className,
  error = false,
  value = "",
  defaultValue,
  disabled,
  onChange,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: SelectProps) {
  const selectId =
    id ?? (label ? `select-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const triggerClass = ["select-trigger", error ? "select-trigger--error" : "", className]
    .filter(Boolean)
    .join(" ");

  const resolvedValue = value || defaultValue || "";

  const selected = options.find((option) => option.value === resolvedValue);

  const control = (
    <SelectPrimitive.Root
      value={resolvedValue}
      disabled={disabled}
      onValueChange={(next) => onChange?.({ target: { value: next } })}
    >
      <SelectPrimitive.Trigger
        id={selectId}
        className={triggerClass}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid ?? error ?? undefined}
      >
        <span className="select-trigger__value">
          <SelectPrimitive.Value placeholder="Select…">
            {selected?.label}
          </SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon className="select-trigger__icon">
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="select-content"
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
        >
          <SelectPrimitive.Viewport className="select-content__viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="select-item"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="select-item__indicator">
                  <Check size={14} strokeWidth={2} aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );

  if (!label) {
    return control;
  }

  return (
    <div className={error ? "select-wrap select-wrap--error" : "select-wrap"}>
      <label className="select-wrap__label" htmlFor={selectId}>
        {label}
      </label>
      {control}
    </div>
  );
}

export function SelectItemIndicator({ children }: { children: ReactNode }) {
  return <SelectPrimitive.ItemIndicator>{children}</SelectPrimitive.ItemIndicator>;
}

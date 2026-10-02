import * as SwitchPrimitive from "@radix-ui/react-switch";
import "./Switch.css";

export interface SwitchProps {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({
  id,
  checked,
  disabled,
  onCheckedChange,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      className="metrio-switch"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onCheckedChange={onCheckedChange}
    >
      <SwitchPrimitive.Thumb className="metrio-switch__thumb" />
    </SwitchPrimitive.Root>
  );
}

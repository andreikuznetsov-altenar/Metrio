import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { formatPerformanceDateDisplay } from "../../domain/performance/performanceDateRange";
import { parseIsoDateOnly, toIsoDateOnly } from "./datePickerValue";
import "./MetrioDatePicker.css";
import "react-day-picker/style.css";

export interface MetrioDatePickerProps {
  id?: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (isoDate: string) => void;
}

export function MetrioDatePicker({
  id,
  label,
  value,
  disabled,
  onChange,
}: MetrioDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIsoDateOnly(value), [value]);
  const display = formatPerformanceDateDisplay(value) || "Select date";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="metrio-date-picker">
        <span className="metrio-date-picker__label">{label}</span>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            className="metrio-date-picker__trigger"
            aria-label={`${label} date, ${display}`}
            disabled={disabled}
          >
            <CalendarDays
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className="metrio-date-picker__icon"
            />
            <span className="metrio-date-picker__value">{display}</span>
          </button>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          className="metrio-date-picker__popover"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
        >
          <DayPicker
            mode="single"
            weekStartsOn={1}
            selected={selected ?? undefined}
            onSelect={(day) => {
              if (!day) return;
              onChange(toIsoDateOnly(day));
              setOpen(false);
            }}
            defaultMonth={selected ?? undefined}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

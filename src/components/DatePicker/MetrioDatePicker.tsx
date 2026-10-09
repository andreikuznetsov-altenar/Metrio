import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { DayPicker, type ChevronProps } from "react-day-picker";
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
  /** Prefer top in short drawers so the calendar is not clipped. */
  popoverSide?: "top" | "bottom";
  /** Inline label beside field (filters) or stacked label above full-width field (forms). */
  layout?: "inline" | "stacked";
  testId?: string;
}

function DatePickerChevron({ orientation, className, ...props }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      className={["metrio-date-picker__nav", className].filter(Boolean).join(" ")}
      {...props}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function MetrioDatePicker({
  id,
  label,
  value,
  disabled,
  onChange,
  popoverSide = "bottom",
  layout = "inline",
  testId,
}: MetrioDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseIsoDateOnly(value), [value]);
  const display = formatPerformanceDateDisplay(value) || "Select date";
  const pickerClass =
    layout === "stacked"
      ? "metrio-date-picker metrio-date-picker--stacked"
      : "metrio-date-picker";

  const openPicker = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={pickerClass}>
        {layout === "stacked" ? (
          <span
            className="metrio-date-picker__label metrio-date-picker__label--stacked"
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            role="presentation"
          >
            {label}
          </span>
        ) : (
          <span className="metrio-date-picker__label">{label}</span>
        )}
        <Popover.Trigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            className="metrio-date-picker__trigger"
            data-state={open ? "open" : "closed"}
            aria-label={`${label} date, ${display}`}
            disabled={disabled}
            data-testid={testId}
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
          side={popoverSide}
          align="start"
          sideOffset={6}
          collisionPadding={16}
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
            components={{ Chevron: DatePickerChevron }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

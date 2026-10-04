import type { TextareaHTMLAttributes } from "react";
import "./Textarea.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: boolean;
}

export function Textarea({
  label,
  id,
  className,
  error = false,
  rows = 3,
  ...props
}: TextareaProps) {
  const inputId =
    id ?? (label ? `textarea-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const areaClass = ["textarea", "metrio-field", error ? "textarea--error" : "", className]
    .filter(Boolean)
    .join(" ");

  const area = (
    <textarea
      id={inputId}
      className={areaClass}
      rows={rows}
      aria-invalid={error || undefined}
      {...props}
    />
  );

  if (!label) {
    return area;
  }

  return (
    <label className={error ? "field field--error" : "field"} htmlFor={inputId}>
      <span className="field__label">{label}</span>
      {area}
    </label>
  );
}

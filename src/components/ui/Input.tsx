import type { InputHTMLAttributes } from "react";
import "./ui.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
}

export function Input({ label, id, className, error = false, ...props }: InputProps) {
  const inputId =
    id ?? (label ? `input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const inputClass = ["ui-input", error ? "ui-input--error" : "", className]
    .filter(Boolean)
    .join(" ");

  const input = (
    <input
      id={inputId}
      className={inputClass}
      aria-invalid={error || undefined}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label className="ui-field" htmlFor={inputId}>
      <span className="ui-field__label">{label}</span>
      {input}
    </label>
  );
}

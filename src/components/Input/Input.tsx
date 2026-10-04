import type { InputHTMLAttributes } from "react";
import "./Input.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
}

export function Input({ label, id, className, error = false, ...props }: InputProps) {
  const inputId = id ?? (label ? `input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const inputClass = ["input", "metrio-field", error ? "input--error" : "", className]
    .filter(Boolean)
    .join(" ");

  const input = <input id={inputId} className={inputClass} aria-invalid={error || undefined} {...props} />;

  if (!label) {
    return input;
  }

  return (
    <label className={error ? "field field--error" : "field"} htmlFor={inputId}>
      <span className="field__label">{label}</span>
      {input}
    </label>
  );
}

import { useState } from "react";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";

export interface SettingsCredentialFieldProps {
  label: string;
  hasValue: boolean;
  busy?: boolean;
  onSave: (value: string) => Promise<void>;
}

export function SettingsCredentialField({
  label,
  hasValue,
  busy = false,
  onSave,
}: SettingsCredentialFieldProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="settings-credential">
        <span className="settings-row__label">{label}</span>
        <div className="settings-credential__row settings-credential__row--stored">
          <p className="settings-credential__stored" role="status">
            {hasValue ? "Stored securely" : "Not configured"}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setEditing(true);
              setValue("");
              setError(null);
            }}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-credential">
      <span className="settings-row__label">{label}</span>
      <div className="settings-credential__row">
        <Input
          type="password"
          value={value}
          autoComplete="off"
          placeholder="Enter new credential"
          onChange={(event) => setValue(event.target.value)}
        />
        <Button
          type="button"
          variant="primary"
          disabled={busy || !value.trim()}
          onClick={() => {
            void (async () => {
              try {
                await onSave(value);
                setEditing(false);
                setValue("");
                setError(null);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save credential.");
              }
            })();
          }}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setEditing(false);
            setValue("");
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? <p className="settings-row__hint settings-row__hint--error">{error}</p> : null}
    </div>
  );
}

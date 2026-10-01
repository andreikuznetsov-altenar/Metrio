import { Button } from "../components/Button/Button";
import { openLogsFolder } from "../platform/logger";
import "../pages/ConnectionScreen.css";

export interface StartupErrorShellProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onReturnToConnection?: () => void;
}

export function StartupErrorShell({
  title = "Metrio couldn't start.",
  message,
  onRetry,
  onReturnToConnection,
}: StartupErrorShellProps) {
  return (
    <div className="connection-screen" data-testid="startup-error-shell">
      <div className="connection-screen__inner">
        <p className="connection-screen__logo" aria-label="Metrio">
          metrio
        </p>
        <div className="connection-panel">
          <h1 className="type-heading" style={{ margin: 0 }}>
            {title}
          </h1>
          <p className="connection-panel__form-error" style={{ color: "var(--color-text-secondary)" }}>
            {message}
          </p>
          <div className="connection-panel__submit" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {onRetry ? (
              <Button type="button" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
            {onReturnToConnection ? (
              <Button type="button" variant="secondary" onClick={onReturnToConnection}>
                Return to connection
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void openLogsFolder().catch(() => undefined)}
            >
              Open logs folder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

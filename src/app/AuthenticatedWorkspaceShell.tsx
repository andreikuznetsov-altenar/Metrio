import { AppShell } from "../components/AppShell/AppShell";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import { Button } from "../components/Button/Button";
import { MetrioAppHeader } from "../shell/MetrioAppHeader";
import { WORKSPACE_LOAD_ERROR_MESSAGE } from "./workspaceSession";
import "./AuthenticatedWorkspaceShell.css";

type ShellVariant = "loading" | "error";

export interface AuthenticatedWorkspaceShellProps {
  variant: ShellVariant;
  message?: string | null;
  onRetry?: () => void;
  onReconnect?: () => void;
}

export function AuthenticatedWorkspaceShell({
  variant,
  message,
  onRetry,
  onReconnect,
}: AuthenticatedWorkspaceShellProps) {
  const isLoading = variant === "loading";
  const errorMessage = message?.trim() || WORKSPACE_LOAD_ERROR_MESSAGE;

  return (
    <AppShell
      header={
        <MetrioAppHeader
          activeRoute="performance"
          feedbackEnabled={false}
          onNavigate={() => undefined}
          onOpenSettings={() => undefined}
        />
      }
    >
      <ScrollArea>
        <div
          className="workspace-shell page-content"
          data-testid={
            isLoading ? "workspace-initializing" : "workspace-init-error"
          }
        >
          <h1 className="type-heading">Performance</h1>
          {isLoading ? (
            <p className="workspace-shell__message">
              Loading your workspace…
            </p>
          ) : (
            <>
              <p className="workspace-shell__message">
                {errorMessage}
              </p>
              <div className="workspace-shell__actions">
                <Button type="button" onClick={onRetry}>
                  Retry
                </Button>
                <Button type="button" variant="secondary" onClick={onReconnect}>
                  Reconnect
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </AppShell>
  );
}

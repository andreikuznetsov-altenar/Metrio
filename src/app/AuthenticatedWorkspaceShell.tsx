import { AppShell } from "../components/AppShell/AppShell";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import { Button } from "../components/Button/Button";
import { WorkspaceContentLoadingState } from "../components/WorkspaceContentLoading/WorkspaceContentLoadingState";
import { MetrioAppHeader } from "../shell/MetrioAppHeader";
import { WORKSPACE_LOAD_ERROR_MESSAGE } from "./workspaceSession";
import "../pages/home/dashboard/executive-dashboard.css";
import "../pages/home/home.css";
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
        {isLoading ? (
          <WorkspaceContentLoadingState
            title="Loading your workspace…"
            body="Preparing your profile and team context."
            testId="workspace-initializing"
          />
        ) : (
          <div className="workspace-shell workspace-shell--error" data-testid="workspace-init-error">
            <section
              className="home-empty-state home-empty-state--centered workspace-content-loading"
              role="alert"
            >
              <h2 className="home-empty-state__title">Couldn&apos;t load your workspace</h2>
              <p className="home-empty-state__body">{errorMessage}</p>
              <div className="home-empty-state__actions workspace-shell__actions">
                <Button type="button" onClick={onRetry}>
                  Retry
                </Button>
                <Button type="button" variant="secondary" onClick={onReconnect}>
                  Reconnect
                </Button>
              </div>
            </section>
          </div>
        )}
      </ScrollArea>
    </AppShell>
  );
}

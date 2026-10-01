import {
  Component,
  useEffect,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { bootLog, bootLogError } from "./bootDiagnostics";
import { useConnectionGate } from "./ConnectionContext";
import { clearConnection } from "./connectionStorage";
import { AppLayout } from "./AppLayout";
import { AuthenticatedWorkspaceShell } from "./AuthenticatedWorkspaceShell";
import { useCurrentUser } from "./CurrentUserContext";
import "./AuthenticatedApp.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReconnect: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AuthenticatedRenderErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    bootLogError("ERR-AUTH", error);
    if (import.meta.env.DEV) {
      console.error("AuthenticatedApp render error", error, info.componentStack);
    }
  }

  private retryLayout = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <AuthenticatedWorkspaceShell
          variant="error"
          onRetry={this.retryLayout}
          onReconnect={this.props.onReconnect}
        />
      );
    }
    return this.props.children;
  }
}

function AuthenticatedAppContent() {
  const { workspaceStatus, workspaceError, initializeWorkspace } = useCurrentUser();
  const { resetConnection } = useConnectionGate();

  useEffect(() => {
    if (workspaceStatus === "idle") {
      void initializeWorkspace();
    }
  }, [workspaceStatus, initializeWorkspace]);

  const onReconnect = () => {
    void clearConnection().finally(() => {
      resetConnection();
    });
  };

  if (workspaceStatus === "error") {
    return (
      <AuthenticatedWorkspaceShell
        variant="error"
        message={workspaceError}
        onRetry={() => void initializeWorkspace()}
        onReconnect={onReconnect}
      />
    );
  }

  useEffect(() => {
    if (workspaceStatus === "ready") {
      bootLog("16R", "AuthenticatedApp workspace ready");
    }
  }, [workspaceStatus]);

  if (workspaceStatus !== "ready") {
    return <AuthenticatedWorkspaceShell variant="loading" />;
  }

  return (
    <AuthenticatedRenderErrorBoundary onReconnect={onReconnect}>
      <AppLayout />
    </AuthenticatedRenderErrorBoundary>
  );
}

/** Post-auth shell — never render an empty viewport. */
export function AuthenticatedApp() {
  useEffect(() => {
    bootLog("14", "AuthenticatedApp mounted");
  }, []);

  return (
    <div
      data-testid="authenticated-app"
      className="authenticated-app"
      data-authenticated-viewport="true"
    >
      <AuthenticatedAppContent />
    </div>
  );
}

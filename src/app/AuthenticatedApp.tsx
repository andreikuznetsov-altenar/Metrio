import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppShell } from "../components/AppShell/AppShell";
import { ScrollArea } from "../components/ScrollArea/ScrollArea";
import { MetrioAppHeader } from "../shell/MetrioAppHeader";
import { AppLayout } from "./AppLayout";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

function PerformanceFallback() {
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
          data-testid="performance-fallback"
          className="page-content"
          style={{ padding: "var(--space-6)" }}
        >
          <h1 className="type-heading">Performance</h1>
        </div>
      </ScrollArea>
    </AppShell>
  );
}

/** Post-auth shell — never render an empty viewport. */
export class AuthenticatedApp extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("AuthenticatedApp render error", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <PerformanceFallback />;
    }

    return (
      <div data-testid="authenticated-app">
        <AppLayout />
      </div>
    );
  }
}

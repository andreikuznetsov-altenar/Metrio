import { Component, type ErrorInfo, type ReactNode } from "react";
import { bootLogError } from "./bootDiagnostics";
import { StartupErrorShell } from "./StartupErrorShell";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    bootLogError("ERR", error);
    if (import.meta.env.DEV) {
      console.error("Root render error", error, info.componentStack);
    }
  }

  private retry = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <StartupErrorShell
          message="Something went wrong while starting Metrio. You can retry or open the logs folder for details."
          onRetry={this.retry}
        />
      );
    }
    return this.props.children;
  }
}

import { useEffect } from "react";
import { ConnectionProvider, useConnectionGate } from "./app/ConnectionContext";
import { AuthenticatedApp } from "./app/AuthenticatedApp";
import { FoundationDevApp } from "./app/FoundationDevApp";
import { SessionBootstrapShell } from "./app/SessionBootstrapShell";
import { StartupErrorShell } from "./app/StartupErrorShell";
import { bootLog } from "./app/bootDiagnostics";
import { ConnectionScreen } from "./pages/ConnectionScreen";

function isDevFoundationGallery(): boolean {
  return import.meta.env.DEV && window.location.hash === "#foundation";
}

function AppRoot() {
  const {
    isConnected,
    isBootstrapping,
    startupError,
    retryBootstrap,
    resetConnection,
  } = useConnectionGate();

  useEffect(() => {
    bootLog("12", `AppRoot render gate=${isBootstrapping ? "bootstrapping" : isConnected ? "connected" : "disconnected"}`);
  }, [isBootstrapping, isConnected]);

  if (startupError && !import.meta.env.DEV) {
    return (
      <StartupErrorShell
        message={startupError}
        onRetry={retryBootstrap}
        onReturnToConnection={resetConnection}
      />
    );
  }

  if (isDevFoundationGallery()) {
    return <FoundationDevApp />;
  }

  if (isBootstrapping) {
    return <SessionBootstrapShell />;
  }

  if (!isConnected) {
    return <ConnectionScreen />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ConnectionProvider>
      <AppRoot />
    </ConnectionProvider>
  );
}

export default App;

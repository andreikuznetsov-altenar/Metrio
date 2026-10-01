import { ConnectionProvider, useConnectionGate } from "./app/ConnectionContext";
import { AuthenticatedApp } from "./app/AuthenticatedApp";
import { FoundationDevApp } from "./app/FoundationDevApp";
import { SessionBootstrapShell } from "./app/SessionBootstrapShell";
import { ConnectionScreen } from "./pages/ConnectionScreen";

function isDevFoundationGallery(): boolean {
  return import.meta.env.DEV && window.location.hash === "#foundation";
}

function AppRoot() {
  const { isConnected, isBootstrapping } = useConnectionGate();

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

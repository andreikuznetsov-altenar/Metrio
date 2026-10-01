import "../pages/ConnectionScreen.css";

export function SessionBootstrapShell() {
  return (
    <div
      className="connection-screen"
      data-testid="session-bootstrapping"
      role="status"
    >
      <div className="connection-screen__panel">
        <p className="connection-screen__subtitle">Loading your session…</p>
      </div>
    </div>
  );
}

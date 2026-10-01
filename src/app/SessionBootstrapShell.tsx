import "../pages/ConnectionScreen.css";

export function SessionBootstrapShell() {
  return (
    <div
      className="connection-screen"
      data-testid="session-bootstrapping"
      role="status"
    >
      <div className="connection-screen__inner">
        <p className="connection-screen__logo" aria-label="Metrio">
          metrio
        </p>
        <p className="connection-screen__footnote">Loading your session…</p>
      </div>
    </div>
  );
}

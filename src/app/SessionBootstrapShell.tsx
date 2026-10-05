import { ConnectionScreenLogo } from "../pages/ConnectionScreenLogo";
import "../pages/ConnectionScreen.css";

export function SessionBootstrapShell() {
  return (
    <div
      className="connection-screen"
      data-testid="session-bootstrapping"
      role="status"
    >
      <div className="connection-screen__inner">
        <ConnectionScreenLogo />
        <p className="connection-screen__footnote">Loading your session…</p>
      </div>
    </div>
  );
}

import { invoke } from "@tauri-apps/api/core";
import type { TraySummaryModel } from "../domain/tray/buildTraySummaryModel";
import "./tray-popover.css";

export function TrayPopoverPanel({ summary }: { summary: TraySummaryModel }) {
  const run = (actionId: string) => {
    void invoke("tray_popover_action", { actionId });
  };

  return (
    <div className="tray-popover-shell">
      <div className="tray-popover" data-testid="tray-popover">
        <section className="tray-popover__summary" aria-label="Tray summary">
          <div className="tray-popover__row">
            <span>Open tasks</span>
            <span className="tray-popover__value">{summary.openTaskCount}</span>
          </div>
          <div className="tray-popover__row">
            <span>Problem tasks</span>
            <span className="tray-popover__value">{summary.problemTaskCount}</span>
          </div>
          {summary.indexAvailable ? (
            <div className="tray-popover__row">
              <span>{summary.indexLabel}</span>
              <span className="tray-popover__value tray-popover__value--text">
                {summary.indexValue}
              </span>
            </div>
          ) : null}
        </section>

        <div className="tray-popover__divider" role="separator" />

        <button
          type="button"
          className="tray-popover__action"
          onClick={() => run("notifications")}
        >
          <span className="tray-popover__action-label">Notifications</span>
          {summary.unreadNotificationCount > 0 ? (
            <span className="tray-popover__badge">{summary.unreadNotificationCount}</span>
          ) : null}
        </button>

        <div className="tray-popover__divider" role="separator" />

        <nav className="tray-popover__actions" aria-label="Tray commands">
          <button type="button" className="tray-popover__action" onClick={() => run("open")}>
            <span className="tray-popover__action-label">Open Metrio</span>
          </button>
          <button type="button" className="tray-popover__action" onClick={() => run("refresh")}>
            <span className="tray-popover__action-label">Refresh</span>
          </button>
          <button type="button" className="tray-popover__action" onClick={() => run("settings")}>
            <span className="tray-popover__action-label">Settings</span>
          </button>
          <button type="button" className="tray-popover__action" onClick={() => run("quit")}>
            <span className="tray-popover__action-label">Quit</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

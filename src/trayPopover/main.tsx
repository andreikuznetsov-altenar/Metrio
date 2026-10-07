import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { listen } from "@tauri-apps/api/event";
import { TrayPopoverPanel } from "../tray/TrayPopoverPanel";
import {
  fetchTraySummaryFromNative,
  traySummaryFromDto,
  type TraySummaryDto,
} from "../platform/traySummaryBridge";
import { emptyTraySummary } from "../platform/trayActionCenter";
import "../styles/globals.css";
import "../tray/tray-popover.css";

function TrayPopoverApp() {
  const [summary, setSummary] = useState(emptyTraySummary);

  useEffect(() => {
    void fetchTraySummaryFromNative().then((loaded) => {
      if (loaded) setSummary(loaded);
    });
    const unsubs: Array<() => void> = [];
    void listen<TraySummaryDto | null>("tray-summary-updated", (event) => {
      if (event.payload) {
        setSummary(traySummaryFromDto(event.payload));
      }
    })
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  return <TrayPopoverPanel summary={summary} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TrayPopoverApp />
  </React.StrictMode>,
);

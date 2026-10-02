import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useOptionalMetrioUpdate } from "./UpdateContext";
import { pushTrayFromContext } from "../platform/trayActionCenter";
import { getLastTrayContextForUpdate } from "../platform/trayUpdateBridge";

export function UpdateTrayEffects({
  onOpenAbout,
}: {
  onOpenAbout: () => void;
}) {
  const update = useOptionalMetrioUpdate();

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    void listen("tray-update-available", () => onOpenAbout())
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [onOpenAbout]);

  useEffect(() => {
    const trayContext = getLastTrayContextForUpdate();
    if (!trayContext || !update) return;
    void pushTrayFromContext({
      ...trayContext,
      softwareUpdateAvailable: update.checkResult.status === "available",
    });
  }, [update?.checkResult.status]);

  return null;
}

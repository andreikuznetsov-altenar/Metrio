import { useEffect } from "react";
import { NOTIFICATION_EVENTS_CHANGED } from "../platform/notificationEvents";
import { refreshTrayFromLastContext } from "../platform/trayActionCenter";

/** Keeps tray badge and Notifications row in sync with Notification Center. */
export function TraySummarySyncEffects() {
  useEffect(() => {
    const onChanged = () => {
      void refreshTrayFromLastContext();
    };
    window.addEventListener(NOTIFICATION_EVENTS_CHANGED, onChanged);
    return () => window.removeEventListener(NOTIFICATION_EVENTS_CHANGED, onChanged);
  }, []);
  return null;
}

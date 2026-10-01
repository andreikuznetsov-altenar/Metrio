import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { loadPreferences } from "../platform/preferences";
import { syncGeneralPreferencesToNative } from "../platform/generalPreferencesSync";

/** Native lifecycle hooks that are not tied to a single page. */
export function RuntimeShellEffects() {
  useEffect(() => {
    let cancelled = false;
    void loadPreferences()
      .then((prefs) => {
        if (!cancelled) {
          void syncGeneralPreferencesToNative(prefs.general);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("tray-open", () => undefined)
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => {
      unlisten?.();
    };
  }, []);

  return null;
}

import { useEffect, useState } from "react";
import { resolveMetrioApiBaseUrl } from "../../config/metrioCloud";
import { Button } from "../../components/Button/Button";
import {
  connectMetrioCloudDevSession,
  disconnectMetrioCloud,
  getMetrioCloudStatus,
} from "../../services/metrioCloud/metrioCloudSession";
import { loadPreferences } from "../../platform/preferences";
import { migrateLocalGoalsToCloudIfEmpty } from "../../services/metrioCloud/migrateLocalData";

export function MetrioCloudSettingsPanel() {
  const [status, setStatus] = useState(getMetrioCloudStatus());
  const [bambooId, setBambooId] = useState("");
  const apiUrl = resolveMetrioApiBaseUrl();

  useEffect(() => {
    const onChange = () => setStatus(getMetrioCloudStatus());
    window.addEventListener("metrio-cloud-status-changed", onChange);
    void loadPreferences().then((prefs) => {
      setBambooId(prefs.teamDetection?.employee?.id ?? "");
    });
    return () => window.removeEventListener("metrio-cloud-status-changed", onChange);
  }, []);

  return (
    <div className="settings-card__body" data-testid="metrio-cloud-settings">
      <div className="settings-card__head">
        <h3 className="settings-card__title">Metrio shared services</h3>
        <span
          className={
            status.state === "connected"
              ? "settings-status-badge settings-status-badge--ok"
              : "settings-status-badge settings-status-badge--offline"
          }
        >
          {status.state === "connected" ? "Connected" : "Unavailable"}
        </span>
      </div>
      <p className="settings-row__hint">
        Shared goals, company config, and onboarding state.
        {apiUrl ? ` Endpoint: ${apiUrl}` : " No API URL in this build."}
      </p>
      {status.lastError ? (
        <p className="settings-row__hint">{status.lastError}</p>
      ) : null}
      <div className="settings-button-group">
        <Button
          variant="secondary"
          disabled={!apiUrl || !bambooId}
          onClick={() =>
            void connectMetrioCloudDevSession(bambooId).then(() =>
              migrateLocalGoalsToCloudIfEmpty(),
            )
          }
        >
          Connect (dev)
        </Button>
        <Button variant="secondary" onClick={() => disconnectMetrioCloud()}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}

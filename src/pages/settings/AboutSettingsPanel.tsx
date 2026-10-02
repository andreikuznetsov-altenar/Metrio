import { Button } from "../../components/Button/Button";
import { useOptionalMetrioUpdate } from "../../app/UpdateContext";
import { getBuildInfo } from "../../config/build";
import { formatBuildLabel } from "../../config/build";

export function AboutSettingsPanel() {
  const update = useOptionalMetrioUpdate();
  const buildInfo = update?.buildInfo ?? getBuildInfo();
  const checkResult = update?.checkResult ?? {
    status: "idle" as const,
    currentVersion: buildInfo.version,
  };
  const installProgress = update?.installProgress ?? {
    phase: "idle" as const,
    percent: null,
  };
  const updaterEnabled = update?.updaterEnabled ?? false;
  const checkForUpdates = update?.checkForUpdates ?? (async () => undefined);
  const installUpdate = update?.installUpdate ?? (async () => undefined);

  const statusLabel = (() => {
    switch (checkResult.status) {
      case "checking":
        return "Checking…";
      case "up-to-date":
        return "Up to date";
      case "available":
        return "Update available";
      case "error":
        return "Unable to check";
      default:
        return updaterEnabled ? "Not checked yet" : "Development build";
    }
  })();

  const notes =
    checkResult.status === "available"
      ? (checkResult.notes ?? "").split("\n").filter(Boolean)
      : [];

  return (
    <div className="settings-panel" data-testid="about-settings">
      <h2 className="settings-panel__title">About Metrio</h2>
      <p className="settings-panel__lead">
        {formatBuildLabel(buildInfo)}
      </p>

      <div className="about-update" aria-live="polite">
        <p className="about-update__status">{statusLabel}</p>
        {checkResult.status === "available" && checkResult.availableVersion ? (
          <p className="about-update__version">
            Version {checkResult.availableVersion}
          </p>
        ) : null}
        {checkResult.status === "error" && checkResult.message ? (
          <p className="about-update__error" role="alert">
            {checkResult.message}
          </p>
        ) : null}
        {notes.length > 0 ? (
          <div className="about-update__notes">
            <h3>What&apos;s new</h3>
            <ul>
              {notes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {installProgress.phase === "downloading" ? (
          <p className="about-update__progress">
            Downloading update
            {installProgress.percent != null ? ` · ${installProgress.percent}%` : "…"}
          </p>
        ) : null}
        {installProgress.phase === "installing" ? (
          <p className="about-update__progress">Installing update…</p>
        ) : null}
        {installProgress.phase === "error" && installProgress.message ? (
          <p className="about-update__error" role="alert">
            {installProgress.message}
          </p>
        ) : null}

        <div className="about-update__actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void checkForUpdates()}
            disabled={checkResult.status === "checking"}
          >
            Check for updates
          </Button>
          {checkResult.status === "available" ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => void installUpdate()}
              disabled={
                installProgress.phase === "downloading" ||
                installProgress.phase === "installing"
              }
            >
              Install update
            </Button>
          ) : null}
          {installProgress.phase === "error" ? (
            <Button type="button" variant="ghost" onClick={() => void installUpdate()}>
              Try again
            </Button>
          ) : null}
        </div>
        {checkResult.status === "available" ? (
          <p className="about-update__hint">
            Metrio will restart after the update is installed.
          </p>
        ) : null}
      </div>
    </div>
  );
}

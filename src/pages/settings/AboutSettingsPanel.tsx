import { Button } from "../../components/Button/Button";
import { useOptionalMetrioUpdate } from "../../app/UpdateContext";
import {
  formatBuildChannelLine,
  formatBuildVersionLine,
  getBuildInfo,
  isUpdaterAvailableForBuild,
} from "../../config/build";
import { EntityLink } from "../../components/EntityLink/EntityLink";

const AUTHOR_NAME = "Andrei Kuznetsov";
const AUTHOR_EMAIL = "andrei.kuznetsov@altenar.com";

export function AboutSettingsPanel({ embedded = false }: { embedded?: boolean }) {
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
  const updaterAvailable = updaterEnabled && isUpdaterAvailableForBuild(buildInfo);
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
        return "Not checked yet";
    }
  })();

  const notes =
    checkResult.status === "available"
      ? (checkResult.notes ?? "").split("\n").filter(Boolean)
      : [];

  const showUpdaterError =
    updaterAvailable && checkResult.status === "error" && checkResult.message;

  return (
    <div
      className={embedded ? "settings-card__body" : "settings-panel"}
      data-testid="about-settings"
    >
      {!embedded ? <h2 className="settings-panel__title">About Metrio</h2> : null}

      <div className="settings-meta-list" data-testid="about-meta">
        <div className="settings-meta-row">
          <span className="settings-meta-row__label">Metrio</span>
          <span className="settings-meta-row__value">{formatBuildVersionLine(buildInfo)}</span>
        </div>
        <div className="settings-meta-row">
          <span className="settings-meta-row__label">Build</span>
          <span className="settings-meta-row__value" data-testid="about-build-channel">
            {formatBuildChannelLine(buildInfo)}
          </span>
        </div>
        <div className="settings-meta-row settings-meta-row--stacked">
          <span className="settings-meta-row__label">Created by</span>
          <span className="settings-meta-row__value">
            <span>{AUTHOR_NAME}</span>
            <EntityLink href={`mailto:${AUTHOR_EMAIL}`} className="about-author-email">
              {AUTHOR_EMAIL}
            </EntityLink>
          </span>
        </div>
      </div>

      {updaterAvailable ? (
        <div className="about-update about-update--compact" aria-live="polite">
          <div className="about-update__head">
            <p
              className={`about-update__status${showUpdaterError ? " about-update__status--error" : ""}`}
              data-testid="about-update-status"
            >
              {statusLabel}
            </p>
            {checkResult.status === "available" && checkResult.availableVersion ? (
              <p className="about-update__version">
                Version {checkResult.availableVersion}
              </p>
            ) : null}
          </div>
          {showUpdaterError ? (
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
      ) : null}
    </div>
  );
}

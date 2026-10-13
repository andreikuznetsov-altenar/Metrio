import { Button } from "../components/Button/Button";
import { Modal } from "../components/Modal/Modal";
import { useOptionalMetrioUpdate } from "./UpdateContext";
import "./update-prompt.css";

/** Canonical "Update available" surface: Metrio Modal + Button primitives, no native dialogs. */
export function UpdatePrompt() {
  const update = useOptionalMetrioUpdate();
  if (!update) return null;

  const { promptVisible, dismissPrompt, checkResult, installProgress, installUpdate } = update;
  const busy = installProgress.phase === "downloading" || installProgress.phase === "installing";
  const version = checkResult.availableVersion;

  return (
    <Modal open={promptVisible} onClose={busy ? () => undefined : dismissPrompt} title="Update available">
      <div className="update-prompt" data-testid="update-prompt">
        <p className="update-prompt__copy">
          {version ? `Metrio ${version} is ready to install.` : "A new version of Metrio is ready to install."}
        </p>
        {checkResult.notes ? (
          <ul className="update-prompt__notes">
            {checkResult.notes
              .split("\n")
              .filter(Boolean)
              .map((line) => (
                <li key={line}>{line}</li>
              ))}
          </ul>
        ) : null}
        {installProgress.phase === "downloading" ? (
          <p className="update-prompt__status" role="status">
            Downloading update{installProgress.percent != null ? ` · ${installProgress.percent}%` : "…"}
          </p>
        ) : null}
        {installProgress.phase === "installing" ? (
          <p className="update-prompt__status" role="status">
            Installing update…
          </p>
        ) : null}
        {installProgress.phase === "error" && installProgress.message ? (
          <p className="update-prompt__error" role="alert">
            {installProgress.message}
          </p>
        ) : null}
        <div className="update-prompt__actions">
          <Button type="button" variant="secondary" onClick={dismissPrompt} disabled={busy}>
            Later
          </Button>
          <Button type="button" variant="primary" onClick={() => void installUpdate()} disabled={busy}>
            Update and restart
          </Button>
        </div>
      </div>
    </Modal>
  );
}

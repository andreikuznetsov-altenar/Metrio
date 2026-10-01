import { useEffect, useMemo, useState } from "react";
import { ConnectError } from "../app/connectAndContinue";
import { useConnectionGate, type ConnectionStatus } from "../app/ConnectionContext";
import {
  performConnection,
  readSavedConnection,
} from "../app/connectionStorage";
import { ATLASSIAN_API_TOKEN_URL, getBambooApiKeyHelpUrl } from "../config/links";
import { isAltenarWorkEmail } from "../domain/setup/validation";
import { openExternalUrl } from "../platform/openExternal";
import { Button } from "../components/Button/Button";
import { Input } from "../components/Input/Input";
import { useCurrentUser } from "../app/CurrentUserContext";
import "./ConnectionScreen.css";

export function ConnectionScreen() {
  const { completeConnection } = useConnectionGate();
  const { refreshFromPreferences } = useCurrentUser();

  const [workEmail, setWorkEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [bambooApiKey, setBambooApiKey] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [bambooError, setBambooError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readSavedConnection().then((value) => {
      if (cancelled || !value?.workEmail) return;
      setWorkEmail(value.workEmail);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      isAltenarWorkEmail(workEmail) &&
      jiraToken.trim().length > 0 &&
      bambooApiKey.trim().length > 0
    );
  }, [workEmail, jiraToken, bambooApiKey]);

  const isBusy = status === "connecting";

  const onEmailBlur = () => {
    setEmailTouched(true);
    if (!workEmail.trim()) {
      setEmailError(null);
      return;
    }
    if (!isAltenarWorkEmail(workEmail)) {
      setEmailError("Use your @altenar.com work email.");
    } else {
      setEmailError(null);
    }
  };

  const openHelp = (url: string) => {
    void openExternalUrl(url).catch(() => undefined);
  };

  const onConnect = async () => {
    setEmailTouched(true);
    setEmailError(null);
    setJiraError(null);
    setBambooError(null);
    setFormError(null);

    if (!isAltenarWorkEmail(workEmail)) {
      setEmailError("Use your @altenar.com work email.");
      return;
    }

    setStatus("connecting");

    try {
      await performConnection({ workEmail, jiraToken, bambooApiKey });
      setJiraToken("");
      setBambooApiKey("");
      await refreshFromPreferences();
      completeConnection();
    } catch (error) {
      setStatus("error");
      if (error instanceof ConnectError) {
        if (error.field === "workEmail") setEmailError(error.message);
        else if (error.field === "jiraToken") setJiraError(error.message);
        else if (error.field === "bambooApiKey") setBambooError(error.message);
        else setFormError(error.message);
      } else {
        setFormError("Unable to connect. Check your details and try again.");
      }
    }
  };

  const showEmailError =
    emailError && (emailTouched || status === "error");

  return (
    <div className="connection-screen" data-testid="connection-screen">
      <div className="connection-screen__inner">
        <p className="connection-screen__logo" aria-label="Metrio">
          metrio
        </p>

        <div className="connection-panel">
          <Input
            label="Work email"
            name="work-email"
            type="email"
            autoComplete="username"
            placeholder="name@altenar.com"
            value={workEmail}
            onChange={(event) => setWorkEmail(event.target.value)}
            onBlur={onEmailBlur}
            disabled={isBusy}
            error={!!showEmailError}
          />
          {showEmailError ? (
            <p className="connection-panel__field-error" role="alert">
              {emailError}
            </p>
          ) : null}

          <div className="connection-panel__credential-row">
            <Input
              label="Jira API token"
              name="jira-token"
              type="password"
              autoComplete="off"
              placeholder="Paste your token"
              value={jiraToken}
              onChange={(event) => setJiraToken(event.target.value)}
              disabled={isBusy}
              error={!!jiraError}
            />
            <Button
              type="button"
              variant="ghost"
              className="connection-panel__help-btn"
              disabled={isBusy}
              onClick={() => openHelp(ATLASSIAN_API_TOKEN_URL)}
            >
              Get API token
            </Button>
          </div>
          {jiraError ? (
            <p className="connection-panel__field-error" role="alert">
              {jiraError}
            </p>
          ) : null}

          <div className="connection-panel__credential-row">
            <Input
              label="BambooHR API key"
              name="bamboo-api-key"
              type="password"
              autoComplete="off"
              placeholder="Paste your API key"
              value={bambooApiKey}
              onChange={(event) => setBambooApiKey(event.target.value)}
              disabled={isBusy}
              error={!!bambooError}
            />
            <Button
              type="button"
              variant="ghost"
              className="connection-panel__help-btn"
              disabled={isBusy}
              onClick={() => openHelp(getBambooApiKeyHelpUrl())}
            >
              Get API key
            </Button>
          </div>
          {bambooError ? (
            <p className="connection-panel__field-error" role="alert">
              {bambooError}
            </p>
          ) : null}

          {formError ? (
            <p className="connection-panel__form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <Button
            type="button"
            className="connection-panel__submit"
            onClick={() => void onConnect()}
            disabled={!canSubmit || isBusy}
            loading={status === "connecting"}
          >
            Connect &amp; continue
          </Button>
        </div>

        <button
          type="button"
          className="connection-screen__help-link"
          disabled={isBusy}
          onClick={() => openHelp(getBambooApiKeyHelpUrl())}
        >
          Can&apos;t find API Keys?
        </button>
        <p className="connection-screen__footnote">
          Credentials are stored securely on this device.
        </p>
      </div>
    </div>
  );
}

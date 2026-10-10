import { useState } from 'react';
import { openExternalUrl } from '../../platform/openExternal';
import { formatAppsScriptError } from '../../services/survey/appsScriptSurveyClient';
import { Button, Drawer, Input, InputPassword } from './design-system';

const GOOGLE_APPS_SCRIPT_HOME = 'https://script.google.com/home';

export function FeedbackBridgeSetupDrawer({
  open,
  webAppUrl,
  onWebAppUrlChange,
  onClose,
  onTestConnection,
}: {
  open: boolean;
  webAppUrl: string;
  onWebAppUrlChange: (value: string) => void;
  onClose: () => void;
  onTestConnection: (input: { webAppUrl: string; bridgeSecret: string }) => Promise<void>;
}) {
  const [bridgeSecret, setBridgeSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setError(null);
    setBusy(true);
    try {
      await onTestConnection({
        webAppUrl: webAppUrl.trim(),
        bridgeSecret: bridgeSecret.trim(),
      });
      setBridgeSecret('');
      onClose();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(formatAppsScriptError(raw));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      size="notification"
      title="Set up Google Forms"
      onClose={onClose}
      footer={
        <div className="ds-feedback-drawer-footer ds-feedback-drawer-footer--compact">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      }
    >
      <ol className="feedback-setup-flow">
        <li className="feedback-setup-step">
          <span className="feedback-setup-step__badge">1</span>
          <div className="feedback-setup-step__content">
            <h3>Open Apps Script</h3>
            <p>Open your Google Apps Script console in the account that will own the form bridge.</p>
            <Button variant="secondary" size="small" onClick={() => void openExternalUrl(GOOGLE_APPS_SCRIPT_HOME)}>
              Open Apps Script
            </Button>
          </div>
        </li>
        <li className="feedback-setup-step">
          <span className="feedback-setup-step__badge">2</span>
          <div className="feedback-setup-step__content">
            <h3>Create and deploy Metrio bridge</h3>
            <p>Create the bridge script, run setupMetrio(), then deploy it as a Web App.</p>
          </div>
        </li>
        <li className="feedback-setup-step">
          <span className="feedback-setup-step__badge">3</span>
          <div className="feedback-setup-step__content">
            <h3>Copy Web App URL</h3>
            <p>Use the deployed Web App URL ending in /exec.</p>
          </div>
        </li>
        <li className="feedback-setup-step">
          <span className="feedback-setup-step__badge">4</span>
          <div className="feedback-setup-step__content">
            <h3>Enter connection details</h3>
            <p>Paste the deployed Web App URL and the connection key from setupMetrio().</p>
            <Input
              label="Web App URL"
              value={webAppUrl}
              onChange={(e) => onWebAppUrlChange(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              error={Boolean(error)}
            />
            <InputPassword
              label="Connection key"
              value={bridgeSecret}
              onChange={(e) => setBridgeSecret(e.target.value)}
              placeholder="Paste connection key"
              error={Boolean(error)}
            />
          </div>
        </li>
        <li className="feedback-setup-step">
          <span className="feedback-setup-step__badge">5</span>
          <div className="feedback-setup-step__content">
            <h3>Test connection</h3>
            <p>Confirm Metrio can create and send surveys through the bridge.</p>
            {error ? <p className="feedback-field-error" role="alert">{error}</p> : null}
            <Button
              disabled={busy || !webAppUrl.trim() || !bridgeSecret.trim()}
              loading={busy}
              onClick={() => void runTest()}
            >
              Test connection
            </Button>
          </div>
        </li>
      </ol>
    </Drawer>
  );
}

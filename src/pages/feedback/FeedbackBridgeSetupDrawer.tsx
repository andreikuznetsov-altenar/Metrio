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
          <Button
            disabled={busy || !webAppUrl.trim() || !bridgeSecret.trim()}
            onClick={() => void runTest()}
          >
            {busy ? 'Testing…' : 'Test connection'}
          </Button>
        </div>
      }
    >
      <ol className="feedback-bridge-steps">
        <li>
          <Button variant="secondary" size="small" onClick={() => void openExternalUrl(GOOGLE_APPS_SCRIPT_HOME)}>
            Open Apps Script
          </Button>
        </li>
        <li>Create and deploy the Metrio bridge (Web App).</li>
        <li>Copy the Web App URL.</li>
        <li>Enter the connection key from setupMetrio().</li>
        <li>Test connection to finish setup.</li>
      </ol>
      {error ? <p className="feedback-field-error" role="alert">{error}</p> : null}
      <Input
        label="Web App URL"
        value={webAppUrl}
        onChange={(e) => onWebAppUrlChange(e.target.value)}
        placeholder="https://script.google.com/macros/s/…/exec"
      />
      <InputPassword
        label="Connection key"
        value={bridgeSecret}
        onChange={(e) => setBridgeSecret(e.target.value)}
        placeholder="Paste connection key"
      />
    </Drawer>
  );
}

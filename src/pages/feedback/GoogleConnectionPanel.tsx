import { useState } from 'react';
import type { AppPreferences } from '../../platform/preferences';
import { isSurveyGoogleConfigured, usesAppsScriptGoogle } from '../../services/survey/surveyGoogleClient';
import { formatAppsScriptError } from '../../services/survey/appsScriptSurveyClient';
import { formatGoogleOAuthError } from './feedbackUi';
import './feedback-ds.css';
import {
  Button,
  Drawer,
  Input,
  InputPassword,
  Section,
  SelectDropdown,
  Status,
  StatusBanner,
} from './design-system';
import { googleIntegrationTone, hasGoogleAccount } from './feedbackUi';

export function GoogleConnectionPanel({
  prefs,
  loading,
  message,
  mode = 'feedback',
  showAdvanced = false,
  onConnect,
  onReconnect,
  onDisconnect,
  onUpdatePrefs,
}: {
  prefs: AppPreferences;
  loading?: boolean;
  message?: string | null;
  mode?: 'feedback' | 'settings';
  showAdvanced?: boolean;
  onConnect: (input: { webAppUrl: string; bridgeSecret: string }) => Promise<void>;
  onReconnect: (input: { webAppUrl: string; bridgeSecret: string }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onUpdatePrefs: (patch: Partial<AppPreferences['google']>) => Promise<void>;
}) {
  const [connecting, setConnecting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [showConnectDrawer, setShowConnectDrawer] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState(prefs.google.appsScriptWebAppUrl);
  const [bridgeSecret, setBridgeSecret] = useState('');
  const linked = hasGoogleAccount(prefs);
  const appsScriptMode = usesAppsScriptGoogle(prefs);
  const oauthMode = isSurveyGoogleConfigured(prefs) && !appsScriptMode;
  const displayMessage = message || localMessage;

  const runOAuthConnect = async () => {
    setLocalMessage(null);
    setConnecting(true);
    try {
      await onConnect({ webAppUrl: '', bridgeSecret: '' });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setLocalMessage(formatGoogleOAuthError(raw));
    } finally {
      setConnecting(false);
    }
  };

  const runConnect = async (
    action: (input: { webAppUrl: string; bridgeSecret: string }) => Promise<void>,
  ) => {
    setLocalMessage(null);
    setConnecting(true);
    try {
      await action({ webAppUrl: webAppUrl.trim(), bridgeSecret: bridgeSecret.trim() });
      setShowConnectDrawer(false);
      setBridgeSecret('');
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setLocalMessage(formatAppsScriptError(raw));
    } finally {
      setConnecting(false);
    }
  };

  if (!linked) {
    return (
      <>
        <Section title={mode === 'feedback' ? 'Feedback' : 'Google'}>
          {mode === 'feedback' && (
            <>
              <p className="ds-feedback-connect__lead">
                Create and send team feedback surveys through your connected Google
                account.
              </p>
              <p className="ds-feedback-connect__body">
                {oauthMode
                  ? "Metrio connects to your Google account to create Forms, sync responses, and send survey emails."
                  : "Metrio uses a private Google Apps Script companion to create Forms and send emails from your Google account."}
              </p>
            </>
          )}
          {mode === 'settings' && (
            <p className="ds-feedback-connect__hint">
              Deploy the Metrio companion from <code>apps-script/metrio-feedback</code> and connect it here.
            </p>
          )}
          <div className="ds-feedback-connect__actions">
            <Button
              disabled={connecting || loading}
              onClick={() => (oauthMode ? void runOAuthConnect() : setShowConnectDrawer(true))}
            >
              Connect Google
            </Button>
          </div>
          {mode === 'feedback' && (
            <p className="ds-feedback-connect__footnote">
              Google connection is required only for Feedback.
            </p>
          )}
          {displayMessage && <StatusBanner variant="error">{displayMessage}</StatusBanner>}
        </Section>

        <Drawer
          open={showConnectDrawer}
          title="Connect Google Apps Script"
          onClose={() => setShowConnectDrawer(false)}
          footer={
            <div className="ds-feedback-drawer-footer">
              <Button variant="secondary" onClick={() => setShowConnectDrawer(false)}>Cancel</Button>
              <Button
                disabled={connecting || !webAppUrl.trim() || !bridgeSecret.trim()}
                onClick={() => runConnect(onConnect)}
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </Button>
            </div>
          }
        >
          <p className="ds-feedback-connect__body">
            Paste the deployed Web App URL and the connection key from <code>setupMetrio()</code>.
          </p>
          <Input
            label="Web App URL"
            value={webAppUrl}
            onChange={(e) => setWebAppUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
          <InputPassword
            label="Connection key"
            value={bridgeSecret}
            onChange={(e) => setBridgeSecret(e.target.value)}
            placeholder="Paste the key shown once by setupMetrio()"
          />
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Section
        title="Google"
        headerRight={
          <div className="ds-feedback-google__actions">
            <Button
              variant="secondary"
              size="small"
              disabled={connecting || loading}
              onClick={() => {
                setWebAppUrl(prefs.google.appsScriptWebAppUrl);
                setBridgeSecret('');
                setShowConnectDrawer(true);
              }}
            >
              Replace
            </Button>
            <Button variant="secondary" size="small" onClick={() => setShowDisconnectConfirm(true)}>
              Disconnect
            </Button>
          </div>
        }
      >
        <div className="ds-feedback-google__rows">
          <div className="ds-feedback-google__row">
            <span className="ds-feedback-google__label">Google account</span>
            <Status tone="green" variant="tag">Connected</Status>
            <span className="ds-feedback-google__value">{prefs.google.accountEmail}</span>
          </div>
          <div className="ds-feedback-google__row">
            <span className="ds-feedback-google__label">Google Forms</span>
            <Status tone={googleIntegrationTone(prefs.google.formsConnected)} variant="tag">
              {prefs.google.formsConnected ? 'Connected' : 'Needs attention'}
            </Status>
          </div>
          <div className="ds-feedback-google__row">
            <span className="ds-feedback-google__label">Google Mail</span>
            <Status tone={googleIntegrationTone(prefs.google.gmailConnected)} variant="tag">
              {prefs.google.gmailConnected ? 'Connected' : 'Needs attention'}
            </Status>
          </div>
        </div>
        {displayMessage && (
          <StatusBanner variant={displayMessage.includes('Connected') ? 'success' : 'error'}>
            {displayMessage}
          </StatusBanner>
        )}

        {showAdvanced && appsScriptMode && (
          <div className="ds-feedback-google__advanced">
            <h3 className="ds-feedback-google__advanced-title">Form settings</h3>
            <p className="ds-help-text">
              Google Apps Script forms always collect respondent email.
            </p>
            <p className="ds-help-text">
              Response access is <strong>Anyone with the link</strong>. Restricted access and verified Google email are not available in Apps Script mode.
            </p>
          </div>
        )}
        {showAdvanced && !appsScriptMode && (
          <div className="ds-feedback-google__advanced">
            <h3 className="ds-feedback-google__advanced-title">Advanced</h3>
            <SelectDropdown
              label="Collect responder email"
              value={prefs.google.emailCollectionMode}
              options={[
                { value: 'RESPONDER_INPUT', label: 'Responder enters email' },
                { value: 'VERIFIED', label: 'Verified Google account' },
              ]}
              onChange={(v) =>
                onUpdatePrefs({ emailCollectionMode: v as 'VERIFIED' | 'RESPONDER_INPUT' })
              }
            />
            <SelectDropdown
              label="Who can respond?"
              value={prefs.google.responseAccess}
              options={[
                { value: 'anyone_with_link', label: 'Anyone with the link' },
                { value: 'restricted', label: 'Restricted' },
              ]}
              onChange={(v) =>
                onUpdatePrefs({ responseAccess: v as 'restricted' | 'anyone_with_link' })
              }
            />
          </div>
        )}
      </Section>

      <Drawer
        open={showConnectDrawer}
        title="Replace Google Apps Script connection"
        onClose={() => setShowConnectDrawer(false)}
        footer={
          <div className="ds-feedback-drawer-footer">
            <Button variant="secondary" onClick={() => setShowConnectDrawer(false)}>Cancel</Button>
            <Button
              disabled={connecting || !webAppUrl.trim() || !bridgeSecret.trim()}
              onClick={() => runConnect(onReconnect)}
            >
              {connecting ? 'Connecting…' : 'Replace connection'}
            </Button>
          </div>
        }
      >
        <Input
          label="Web App URL"
          value={webAppUrl}
          onChange={(e) => setWebAppUrl(e.target.value)}
        />
        <InputPassword
          label="Connection key"
          value={bridgeSecret}
          onChange={(e) => setBridgeSecret(e.target.value)}
        />
      </Drawer>

      <Drawer
        open={showDisconnectConfirm}
        title="Disconnect Google?"
        onClose={() => setShowDisconnectConfirm(false)}
        footer={
          <div className="ds-feedback-drawer-footer">
            <Button variant="secondary" onClick={() => setShowDisconnectConfirm(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setShowDisconnectConfirm(false);
                await onDisconnect();
              }}
            >
              Disconnect
            </Button>
          </div>
        }
      >
        <p>
          Disconnecting Google stops Metrio from creating Forms, sending survey emails and syncing responses.
        </p>
        <p className="ds-feedback-connect__hint">
          Existing local survey history remains on this device. Remote Google Forms are not deleted automatically.
        </p>
      </Drawer>
    </>
  );
}

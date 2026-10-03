import { useState } from 'react';
import { Mail } from 'lucide-react';
import type { AppPreferences } from '../../platform/preferences';
import { isSurveyGoogleConfigured, usesAppsScriptGoogle } from '../../services/survey/surveyGoogleClient';
import { formatAppsScriptError } from '../../services/survey/appsScriptSurveyClient';
import { formatGoogleOAuthError } from './feedbackUi';
import { FEEDBACK_HELP } from './feedbackHelp';
import './feedback-ds.css';
import { Badge } from '../../components/Badge/Badge';
import {
  Button,
  Drawer,
  Input,
  InputPassword,
  Section,
  SelectDropdown,
  StatusBanner,
} from './design-system';
import { hasGoogleAccount } from './feedbackUi';
import { openExternalUrl } from '../../platform/openExternal';

const GOOGLE_APPS_SCRIPT_HOME = 'https://script.google.com/home';

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

  const appsScriptConnectDrawer = (
    <Drawer
      open={showConnectDrawer}
      size="notification"
      title={linked ? 'Manage Google connection' : 'Connect Google Apps Script'}
      onClose={() => setShowConnectDrawer(false)}
      footer={
        <div className="ds-feedback-drawer-footer ds-feedback-drawer-footer--compact">
          <Button variant="secondary" onClick={() => setShowConnectDrawer(false)}>Cancel</Button>
          <Button
            variant="secondary"
            disabled={connecting || !webAppUrl.trim() || !bridgeSecret.trim()}
            onClick={() => runConnect(linked ? onReconnect : onConnect)}
          >
            {connecting ? 'Testing…' : 'Test connection'}
          </Button>
          <Button
            disabled={connecting || !webAppUrl.trim() || !bridgeSecret.trim()}
            onClick={() => runConnect(linked ? onReconnect : onConnect)}
          >
            {connecting ? 'Connecting…' : linked ? 'Update connection' : 'Connect'}
          </Button>
        </div>
      }
    >
      <div className="ds-apps-script-setup" data-testid="google-apps-script-setup">
        <p className="ds-feedback-connect__body">
          Legacy Google Apps Script bridge. Use only when your administrator provides
          a Metrio deployment — not the standard Google OAuth flow.
        </p>
        <ol className="ds-apps-script-setup__steps">
          <li>
            Your administrator shares a Google Apps Script project (or deployment
            package) that exposes Metrio survey endpoints for your organization.
          </li>
          <li>
            In that project, deploy as a <strong>Web app</strong> (Execute as: Me,
            Who has access: Anyone with the link, or per admin instructions). Copy
            the deployment URL ending in <code>/exec</code>.
          </li>
          <li>
            Open the script editor, run <code>setupMetrio()</code> once (or follow
            your admin runbook) and copy the connection key it prints.
          </li>
          <li>
            Paste the Web App URL and connection key below, then test the connection
            before saving.
          </li>
          <li>
            After a successful test, choose Connect. Metrio stores credentials
            locally using the same secure path as other integrations.
          </li>
        </ol>
        <div className="settings-button-group">
          <Button
            variant="secondary"
            type="button"
            onClick={() => void openExternalUrl(GOOGLE_APPS_SCRIPT_HOME)}
          >
            Open Google Apps Script
          </Button>
        </div>
      </div>
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
        placeholder="Paste the key from setupMetrio()"
      />
    </Drawer>
  );

  const disconnectDrawer = (
    <Drawer
      open={showDisconnectConfirm}
      size="notification"
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
  );

  if (!linked) {
    if (mode === 'feedback') {
      return (
        <>
          <div className="ds-feedback-connect-panel ds-feedback-onboarding">
            <p className="ds-feedback-connect__lead">
              Create and send team feedback surveys using Google Forms and Gmail.
            </p>
            <div className="ds-feedback-connect__actions">
              <Button
                disabled={connecting || loading}
                onClick={() => (oauthMode ? void runOAuthConnect() : setShowConnectDrawer(true))}
              >
                <Mail size={16} strokeWidth={1.75} aria-hidden className="feedback-btn-icon" />
                Connect Google
              </Button>
            </div>
            <p className="ds-feedback-connect__footnote">{FEEDBACK_HELP.permissionsFootnote}</p>
            {displayMessage && (
              <StatusBanner tone="danger">{displayMessage}</StatusBanner>
            )}
          </div>
          {appsScriptConnectDrawer}
        </>
      );
    }

    return (
      <>
        <Section title="Google">
          <p className="ds-feedback-connect__hint">
            Connect Google to create and send Feedback surveys.
          </p>
          <div className="ds-feedback-connect__actions">
            <Button
              disabled={connecting || loading}
              onClick={() => (oauthMode ? void runOAuthConnect() : setShowConnectDrawer(true))}
            >
              Connect Google
            </Button>
          </div>
          {displayMessage && <StatusBanner tone="danger">{displayMessage}</StatusBanner>}
        </Section>
        {appsScriptConnectDrawer}
      </>
    );
  }

  if (mode === 'feedback') {
    return (
      <>
        <div className="feedback-google-strip">
          <div className="feedback-google-strip__main">
            <span className="feedback-google-strip__label">Google Workspace</span>
            <Badge variant="success">Connected</Badge>
            <span className="feedback-google-strip__email">{prefs.google.accountEmail}</span>
          </div>
          <div className="feedback-google-strip__actions">
            <Button
              variant="secondary"
              size="small"
              disabled={connecting || loading}
              onClick={() => {
                if (oauthMode) {
                  void runOAuthConnect();
                  return;
                }
                setWebAppUrl(prefs.google.appsScriptWebAppUrl);
                setBridgeSecret('');
                setShowConnectDrawer(true);
              }}
            >
              Manage
            </Button>
            <Button variant="secondary" size="small" onClick={() => setShowDisconnectConfirm(true)}>
              Disconnect
            </Button>
          </div>
        </div>
        {!prefs.google.formsConnected && displayMessage && (
          <StatusBanner tone="danger">{displayMessage}</StatusBanner>
        )}
        {appsScriptConnectDrawer}
        {disconnectDrawer}
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
            <Badge variant="success">Connected</Badge>
            <span className="ds-feedback-google__value">{prefs.google.accountEmail}</span>
          </div>
          <div className="ds-feedback-google__row">
            <span className="ds-feedback-google__label">Google Forms</span>
            <Badge variant={prefs.google.formsConnected ? 'success' : 'warning'}>
              {prefs.google.formsConnected ? 'Connected' : 'Needs attention'}
            </Badge>
          </div>
          <div className="ds-feedback-google__row">
            <span className="ds-feedback-google__label">Google Mail</span>
            <Badge variant={prefs.google.gmailConnected ? 'success' : 'warning'}>
              {prefs.google.gmailConnected ? 'Connected' : 'Needs attention'}
            </Badge>
          </div>
        </div>
        {displayMessage && (
          <StatusBanner tone={displayMessage.includes('Connected') ? 'success' : 'danger'}>
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

      {appsScriptConnectDrawer}
      {disconnectDrawer}
    </>
  );
}

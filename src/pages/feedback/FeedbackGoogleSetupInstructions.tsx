import { Button, Drawer } from './design-system';
import { FEEDBACK_HELP } from './feedbackHelp';
import './feedback-disconnected.css';

export interface FeedbackGoogleSetupInstructionsProps {
  open: boolean;
  onClose: () => void;
  onConnectGoogle: () => void;
  onOpenConnectionsSettings: () => void;
  onOpenAppsScriptSetup: () => void;
}

export function FeedbackGoogleSetupInstructions({
  open,
  onClose,
  onConnectGoogle,
  onOpenConnectionsSettings,
  onOpenAppsScriptSetup,
}: FeedbackGoogleSetupInstructionsProps) {
  return (
    <Drawer
      open={open}
      size="notification"
      title="Google setup for Feedback"
      onClose={onClose}
    >
      <div
        className="feedback-setup-instructions__stack"
        data-testid="feedback-google-setup-instructions"
      >
        <div className="feedback-setup-instructions__card">
            <span className="feedback-setup-instructions__badge">Recommended setup</span>
            <h3>Connect with Google OAuth</h3>
            <ol>
              <li>Connect Google from Feedback or Settings → Connections.</li>
              <li>Grant the permissions Metrio needs for Forms, Gmail, and response access.</li>
              <li>Return to Metrio — the Survey tab will unlock create and send flows.</li>
              <li>Prepare a survey and use “Send test email” to verify delivery.</li>
            </ol>
            <p className="ds-feedback-connect__body">{FEEDBACK_HELP.permissionsFootnote}</p>
            <div className="feedback-setup-instructions__actions">
              <Button onClick={onConnectGoogle}>Connect Google</Button>
              <Button variant="secondary" onClick={onOpenConnectionsSettings}>
                Open Connections
              </Button>
            </div>
          </div>

        <div
            className="feedback-setup-instructions__card"
            data-testid="google-apps-script-advanced"
          >
            <span className="feedback-setup-instructions__badge">Advanced / legacy</span>
            <h3>Google Apps Script bridge</h3>
            <p className="ds-feedback-connect__body">
              Use only when your administrator provides a Metrio Apps Script deployment. This is
              not required for standard Google Workspace OAuth.
            </p>
            <ol>
              <li>Obtain the published Web App URL from your administrator.</li>
              <li>Run or install the connection key your administrator shares.</li>
              <li>Paste the Web App URL and bridge secret in Connections.</li>
              <li>Test the connection before sending surveys.</li>
            </ol>
            <div className="feedback-setup-instructions__actions">
              <Button variant="secondary" onClick={onOpenAppsScriptSetup}>
                Apps Script setup
              </Button>
              <Button variant="secondary" onClick={onOpenConnectionsSettings}>
                Open Connections
              </Button>
            </div>
          </div>
      </div>
    </Drawer>
  );
}

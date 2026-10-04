import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getSurveyMetrics, useFeedbackSurveyStore } from '../../app/feedbackSurveyStore';
import { useFeedbackAppStore } from '../../app/FeedbackTeamProvider';
import { useToast } from '../../components/Toast/ToastContext';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { getTodayIsoDate } from '../../domain/jira/dates';
import type { AppPreferences } from '../../platform/preferences';
import { computeDeliveryCounts } from '../../domain/survey/deliveryMetrics';
import type { SurveyQuestion } from '../../domain/survey/types';
import {
  Button,
  MetrioScrollArea,
  Segmented,
  StatusBanner,
  StickyActionBar,
} from './design-system';
import {
  FEEDBACK_TABS,
  type FeedbackTab,
  formatFeedbackLastSync,
  formatFeedbackSendSummaryToast,
  formatGoogleOAuthError,
  hasGoogleAccount,
  isGoogleReadyForSurveys,
} from './feedbackUi';
import { GoogleConnectionPanel } from './GoogleConnectionPanel';
import { FeedbackSurveySetup } from './FeedbackSurveySetup';
import { FeedbackSurveyContent } from './FeedbackSurveyContent';
import { FeedbackSurveyReady } from './FeedbackSurveyReady';
import { FeedbackDeliveryView } from './FeedbackDeliveryView';
import { FeedbackResultsView } from './FeedbackResultsView';
import { FeedbackHistoryView } from './FeedbackHistoryView';
import { FeedbackCyclesView } from './FeedbackCyclesView';
import { FeedbackRecipientsDrawer } from './FeedbackRecipientsDrawer';
import {
  FeedbackRegenerateConfirmDrawer,
  FeedbackReminderConfirmDrawer,
  FeedbackSendConfirmDrawer,
} from './FeedbackConfirmDrawers';
import {
  FeedbackDeliveryDisconnectedPanel,
  FeedbackDeliveryNoSurveyPanel,
  FeedbackResultsDisconnectedPanel,
  FeedbackResultsEmptyPanel,
  FeedbackSurveyDisconnectedPanel,
} from './FeedbackDisconnectedPanels';
import { FeedbackGoogleSetupInstructions } from './FeedbackGoogleSetupInstructions';
import { openSettingsSection } from '../../platform/settingsNavigation';

function FeedbackPageSkeleton() {
  return (
    <div className="ds-feedback-stack">
      <Skeleton height={40} className="feedback-skeleton-strip" />
      <Skeleton height={32} width={320} />
      <Skeleton height={120} />
      <Skeleton height={200} />
    </div>
  );
}

export function FeedbackPage() {
  const toast = useToast();
  const { prefs, teamDetection, teamSnapshot, updatePrefs } = useFeedbackAppStore();
  const surveyStore = useFeedbackSurveyStore();
  const {
    data,
    loading,
    error,
    connectGoogle,
    disconnectGoogle,
    prepareIssues,
    sendSummary,
    showRecipients,
    showSendConfirm,
    showReminderConfirm,
    showRegenerateConfirm,
    recipientSearch,
    recipientStatusFilter,
    init,
    saveDefaults,
    prepareSurvey,
    regenerateGoogleForm,
    sendTestEmail,
    sendSurveyBatch,
    syncResponses,
    sendReminders,
    setShowRecipients,
    setShowSendConfirm,
    setShowReminderConfirm,
    setShowRegenerateConfirm,
    setRecipientSearch,
    setRecipientStatusFilter,
    setActiveSurvey,
    updateRecipient,
    updateActiveSurvey,
  } = surveyStore;

  const isTeamMode = teamDetection?.mode === 'team';
  const [dateFrom, setDateFrom] = useState(prefs.reportFilters.dateFrom);
  const [dateTo, setDateTo] = useState(prefs.reportFilters.dateTo || getTodayIsoDate());
  const [scope, setScope] = useState<'full' | 'direct'>(prefs.reportFilters.teamScope);
  const [projectsText, setProjectsText] = useState(prefs.reportFilters.projects.join(', '));
  const [tab, setTab] = useState<FeedbackTab>('survey');

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<FeedbackTab>).detail;
      if (next) setTab(next);
    };
    window.addEventListener('metrio-open-feedback-tab', handler);
    return () => window.removeEventListener('metrio-open-feedback-tab', handler);
  }, []);
  const [editingDefaults, setEditingDefaults] = useState(true);
  const [formDetailsOpen, setFormDetailsOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [syncingResponses, setSyncingResponses] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [setupInstructionsOpen, setSetupInstructionsOpen] = useState(false);
  const [appsScriptSetupOpen, setAppsScriptSetupOpen] = useState(false);
  const lastSendSummaryRef = useRef<string | null>(null);

  useEffect(() => {
    init().finally(() => setInitializing(false));
  }, [init]);

  useEffect(() => {
    if (!sendSummary || sendSummary === lastSendSummaryRef.current) return;
    lastSendSummaryRef.current = sendSummary;
    const { variant, message } = formatFeedbackSendSummaryToast(sendSummary);
    toast[variant](message);
  }, [sendSummary, toast]);

  useEffect(() => {
    if (!isTeamMode || !data.activeSurveyId) return;
    syncResponses(data.activeSurveyId).catch(() => undefined);
  }, [isTeamMode, data.activeSurveyId, syncResponses]);

  const activeSurvey = useMemo(
    () => data.surveys.find((s) => s.id === data.activeSurveyId) || null,
    [data],
  );

  const metrics = useMemo(() => getSurveyMetrics(data), [data]);
  const counts = activeSurvey ? computeDeliveryCounts(activeSurvey.recipients) : null;
  const reminderCount = activeSurvey
    ? activeSurvey.recipients.filter((r) => r.status === 'sent').length
    : 0;

  const editingQuestions = editingDefaults
    ? data.defaults.questions
    : activeSurvey?.questions || data.defaults.questions;

  const canEditQuestions = editingDefaults || (activeSurvey && !activeSurvey.emailsSent);
  const googleLinked = hasGoogleAccount(prefs);
  const googleSurveyReady = isGoogleReadyForSurveys(prefs);

  const selectedSendCount = (activeSurvey?.recipients || []).filter(
    (r) =>
      r.selected &&
      r.status !== 'sent' &&
      r.status !== 'responded' &&
      r.status !== 'sending' &&
      r.reporterEmail,
  ).length;

  const failedCount = activeSurvey
    ? activeSurvey.recipients.filter((r) => r.status === 'failed' && r.selected).length
    : 0;

  const alreadySentCount = activeSurvey
    ? activeSurvey.recipients.filter((r) => r.status === 'sent' || r.status === 'responded').length
    : 0;

  const missingEmailCount = counts?.missingEmail ?? 0;

  const blockingMessage = useMemo(() => {
    if (error) return formatGoogleOAuthError(error);
    if (prepareIssues.length > 0) return prepareIssues[0]?.message;
    return null;
  }, [error, prepareIssues]);

  const handleGoogleConnect = async (input: { webAppUrl: string; bridgeSecret: string }) => {
    try {
      const status = await connectGoogle(input);
      const patch: Partial<AppPreferences['google']> = { ...status };
      if (input.webAppUrl.trim()) {
        patch.appsScriptWebAppUrl = input.webAppUrl.trim();
        patch.responseAccess = 'anyone_with_link';
        patch.emailCollectionMode = 'RESPONDER_INPUT';
      }
      await updatePrefs({
        google: {
          ...prefs.google,
          ...patch,
        },
      });
      toast.success('Google connected');
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      toast.error(formatGoogleOAuthError(raw));
      throw e;
    }
  };

  const handleGoogleDisconnect = async () => {
    await disconnectGoogle();
    await updatePrefs({
      google: {
        ...prefs.google,
        appsScriptWebAppUrl: '',
        accountEmail: '',
        formsConnected: false,
        gmailConnected: false,
      },
    });
    toast.info('Google disconnected');
  };

  const runPrepareSurvey = async () => {
    const result = await prepareSurvey({
      prefs,
      teamSnapshot,
      teamDetection,
      dateFrom,
      dateTo,
      scope,
      projects: projectsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    });
    if (result) toast.success('Survey prepared');
  };

  const runSyncResponses = async () => {
    if (!activeSurvey) return;
    setSyncingResponses(true);
    try {
      await syncResponses(activeSurvey.id);
      toast.success('Responses updated');
    } catch (e) {
      toast.error("Couldn't refresh responses. Try again.");
    } finally {
      setSyncingResponses(false);
    }
  };

  const updateQuestionAt = async (index: number, patch: Partial<SurveyQuestion>) => {
    const questions = editingQuestions.map((item, i) => (i === index ? { ...item, ...patch } : item));
    if (editingDefaults) {
      await saveDefaults({ questions });
      return;
    }
    if (activeSurvey) {
      await updateActiveSurvey(activeSurvey.id, { questions });
    }
  };

  const moveQuestion = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= editingQuestions.length) return;
    const questions = [...editingQuestions];
    const [item] = questions.splice(index, 1);
    questions.splice(target, 0, item);
    if (editingDefaults) {
      await saveDefaults({ questions });
    } else if (activeSurvey) {
      await updateActiveSurvey(activeSurvey.id, { questions });
    }
  };

  const addQuestion = async () => {
    const questions = [
      ...editingQuestions,
      {
        id: `q_${Date.now()}`,
        googleQuestionId: null,
        active: false,
        type: 'scale' as const,
        title: '',
        options: '1|5',
        helpText: '',
        required: false,
      },
    ];
    if (editingDefaults) await saveDefaults({ questions });
    else if (activeSurvey) await updateActiveSurvey(activeSurvey.id, { questions });
  };

  if (!isTeamMode) {
    return (
      <div className="ds-feedback-page-shell">
        <MetrioScrollArea className="ds-feedback-scroll">
          <div className="metrio-canvas ds-feedback-canvas">
            <p className="ds-feedback-empty-inline">Feedback is available to team leads.</p>
          </div>
        </MetrioScrollArea>
      </div>
    );
  }

  const runOAuthConnect = async () => {
    setGoogleConnecting(true);
    try {
      await handleGoogleConnect({ webAppUrl: '', bridgeSecret: '' });
    } finally {
      setGoogleConnecting(false);
    }
  };

  const preparing = loading && tab === 'survey';
  const sending = loading && tab === 'delivery';

  const footerAction =
    tab === 'survey' ? (
      <Button disabled={loading || !googleSurveyReady} onClick={() => void runPrepareSurvey()}>
        {preparing ? (
          <>
            <Loader2 size={16} className="feedback-btn-spinner" aria-hidden />
            Preparing…
          </>
        ) : (
          'Prepare survey'
        )}
      </Button>
    ) : tab === 'delivery' ? (
      <>
        <Button
          variant="secondary"
          disabled={!activeSurvey || loading || reminderCount === 0}
          onClick={() => setShowReminderConfirm(true)}
        >
          Send reminders ({reminderCount})
        </Button>
        <Button
          disabled={!activeSurvey || sending || !activeSurvey?.responderUri || selectedSendCount === 0}
          onClick={() => setShowSendConfirm(true)}
        >
          {sending ? 'Sending surveys…' : 'Send surveys'}
        </Button>
      </>
    ) : tab === 'results' ? (
      <Button
        variant="secondary"
        disabled={!activeSurvey || syncingResponses}
        onClick={() => void runSyncResponses()}
      >
        {syncingResponses ? (
          <>
            <Loader2 size={16} className="feedback-btn-spinner" aria-hidden />
            Syncing…
          </>
        ) : (
          'Refresh responses'
        )}
      </Button>
    ) : null;

  const stickyLeft =
    tab === 'results' && activeSurvey
      ? formatFeedbackLastSync(activeSurvey.lastResponseSyncAt)
      : null;

  return (
    <div className="ds-feedback-page-shell">
      <MetrioScrollArea className="ds-feedback-scroll">
        <div className="metrio-canvas ds-feedback-canvas">
          {initializing ? (
            <FeedbackPageSkeleton />
          ) : (
            <div className="ds-feedback-stack">
              {googleLinked ? (
                <GoogleConnectionPanel
                  prefs={prefs}
                  loading={loading}
                  mode="feedback"
                  onConnect={handleGoogleConnect}
                  onReconnect={handleGoogleConnect}
                  onDisconnect={handleGoogleDisconnect}
                  onUpdatePrefs={async (patch) => updatePrefs({ google: { ...prefs.google, ...patch } })}
                />
              ) : null}

              {blockingMessage && googleLinked ? (
                <StatusBanner tone="danger">{blockingMessage}</StatusBanner>
              ) : null}

              {prepareIssues.length > 1 && googleSurveyReady ? (
                <ul className="feedback-field-errors">
                  {prepareIssues.slice(1).map((issue) => (
                    <li key={issue.field}>{issue.message}</li>
                  ))}
                </ul>
              ) : null}

              <>
                <Segmented tabs={FEEDBACK_TABS} active={tab} onChange={(id) => setTab(id as FeedbackTab)} />

                <div
                  className="ds-feedback-content"
                  data-testid={`feedback-tab-panel-${tab}`}
                >
                  {tab === 'cycles' ? <FeedbackCyclesView /> : null}

                  {tab === 'survey' && !googleSurveyReady ? (
                    <FeedbackSurveyDisconnectedPanel
                      connecting={googleConnecting}
                      onConnectGoogle={() => void runOAuthConnect()}
                      onOpenSetupInstructions={() => setSetupInstructionsOpen(true)}
                    />
                  ) : null}

                  {tab === 'survey' && googleSurveyReady && (
                    <>
                      <FeedbackSurveySetup
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        scope={scope}
                        projectsText={projectsText}
                        onDateFromChange={setDateFrom}
                        onDateToChange={setDateTo}
                        onScopeChange={setScope}
                        onProjectsChange={setProjectsText}
                      />
                      <FeedbackSurveyContent
                        title={editingDefaults ? data.defaults.title : activeSurvey?.title || ''}
                        emailSubject={editingDefaults ? data.defaults.emailSubject : activeSurvey?.emailSubject || ''}
                        introText={editingDefaults ? data.defaults.introText : activeSurvey?.introText || ''}
                        questions={editingQuestions}
                        editingDefaults={editingDefaults}
                        canEdit={!!canEditQuestions}
                        questionsLocked={activeSurvey?.questionsLocked}
                        onTitleChange={(v) =>
                          editingDefaults
                            ? saveDefaults({ title: v })
                            : activeSurvey && updateActiveSurvey(activeSurvey.id, { title: v })
                        }
                        onEmailSubjectChange={(v) =>
                          editingDefaults
                            ? saveDefaults({ emailSubject: v })
                            : activeSurvey && updateActiveSurvey(activeSurvey.id, { emailSubject: v })
                        }
                        onIntroChange={(v) =>
                          editingDefaults
                            ? saveDefaults({ introText: v })
                            : activeSurvey && updateActiveSurvey(activeSurvey.id, { introText: v })
                        }
                        onToggleMode={activeSurvey ? () => setEditingDefaults((v) => !v) : undefined}
                        onQuestionChange={updateQuestionAt}
                        onQuestionDelete={(index) => {
                          const questions = editingQuestions.filter((_, i) => i !== index);
                          if (editingDefaults) saveDefaults({ questions });
                          else if (activeSurvey) updateActiveSurvey(activeSurvey.id, { questions });
                        }}
                        onQuestionMove={moveQuestion}
                        onAddQuestion={addQuestion}
                      />
                      {activeSurvey && counts && (
                        <FeedbackSurveyReady
                          survey={activeSurvey}
                          counts={counts}
                          formDetailsOpen={formDetailsOpen}
                          onToggleFormDetails={() => setFormDetailsOpen((v) => !v)}
                          onReviewRecipients={() => setShowRecipients(true)}
                          onSendTest={async () => {
                            try {
                              await sendTestEmail(activeSurvey.id, prefs);
                            } catch {
                              toast.error("Couldn't send test email. Try again.");
                            }
                          }}
                          onRegenerate={() => setShowRegenerateConfirm(true)}
                        />
                      )}
                    </>
                  )}

                  {tab === 'delivery' && !googleSurveyReady ? (
                    <FeedbackDeliveryDisconnectedPanel
                      connecting={googleConnecting}
                      onConnectGoogle={() => void runOAuthConnect()}
                      onOpenSetupInstructions={() => setSetupInstructionsOpen(true)}
                    />
                  ) : null}

                  {tab === 'delivery' && googleSurveyReady && activeSurvey && counts ? (
                    <FeedbackDeliveryView
                      recipients={activeSurvey.recipients}
                      counts={counts}
                      reminderCount={reminderCount}
                      failedCount={failedCount}
                      onReviewRecipients={() => setShowRecipients(true)}
                      onSendReminder={() => setShowReminderConfirm(true)}
                      onSendSurveys={() => setShowSendConfirm(true)}
                      selectedSendCount={selectedSendCount}
                      sendDisabled={sending || !activeSurvey.responderUri || selectedSendCount === 0}
                    />
                  ) : null}

                  {tab === 'delivery' && googleSurveyReady && !activeSurvey ? (
                    <FeedbackDeliveryNoSurveyPanel />
                  ) : null}

                  {tab === 'results' && !googleSurveyReady ? (
                    <FeedbackResultsDisconnectedPanel
                      connecting={googleConnecting}
                      onConnectGoogle={() => void runOAuthConnect()}
                      onOpenSetupInstructions={() => setSetupInstructionsOpen(true)}
                    />
                  ) : null}

                  {tab === 'results' && googleSurveyReady && metrics && metrics.respondentCount > 0 ? (
                    <FeedbackResultsView metrics={metrics} sentCount={counts?.delivered ?? 0} />
                  ) : null}

                  {tab === 'results' &&
                  googleSurveyReady &&
                  (!metrics || metrics.respondentCount === 0) ? (
                    <FeedbackResultsEmptyPanel />
                  ) : null}

                  {tab === 'history' ? (
                    <FeedbackHistoryView
                      surveys={[...data.surveys].sort(
                        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
                      )}
                      activeSurveyId={data.activeSurveyId}
                      onSelectSurvey={(id) => {
                        setActiveSurvey(id);
                        setTab('survey');
                      }}
                    />
                  ) : null}
                </div>
              </>
            </div>
          )}
        </div>
      </MetrioScrollArea>

      <FeedbackGoogleSetupInstructions
        open={setupInstructionsOpen}
        onClose={() => setSetupInstructionsOpen(false)}
        onConnectGoogle={() => {
          setSetupInstructionsOpen(false);
          void runOAuthConnect();
        }}
        onOpenConnectionsSettings={() => {
          setSetupInstructionsOpen(false);
          openSettingsSection('connections');
        }}
        onOpenAppsScriptSetup={() => {
          setSetupInstructionsOpen(false);
          setAppsScriptSetupOpen(true);
        }}
      />

      {!googleLinked ? (
        <GoogleConnectionPanel
          headless
          prefs={prefs}
          loading={loading}
          openAppsScriptDrawer={appsScriptSetupOpen}
          onAppsScriptDrawerOpenChange={setAppsScriptSetupOpen}
          onConnect={handleGoogleConnect}
          onReconnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
          onUpdatePrefs={async (patch) => updatePrefs({ google: { ...prefs.google, ...patch } })}
        />
      ) : null}

      {googleSurveyReady && !initializing && tab !== 'history' && (
        <StickyActionBar left={stickyLeft} right={footerAction} />
      )}

      {activeSurvey && (
        <FeedbackRecipientsDrawer
          open={showRecipients}
          recipientCount={activeSurvey.recipients.length}
          recipients={activeSurvey.recipients}
          search={recipientSearch}
          statusFilter={recipientStatusFilter}
          onSearchChange={setRecipientSearch}
          onStatusFilterChange={setRecipientStatusFilter}
          onClose={() => setShowRecipients(false)}
          onToggleRecipient={(id, selected) => updateRecipient(activeSurvey.id, id, { selected })}
          onEmailChange={(id, email) => updateRecipient(activeSurvey.id, id, { reporterEmail: email })}
        />
      )}

      <FeedbackSendConfirmDrawer
        open={showSendConfirm}
        selectedCount={selectedSendCount}
        missingEmailCount={missingEmailCount}
        alreadySentCount={alreadySentCount}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={() => {
          if (activeSurvey) void sendSurveyBatch(activeSurvey.id, prefs);
          setShowSendConfirm(false);
        }}
      />

      <FeedbackReminderConfirmDrawer
        open={showReminderConfirm}
        reminderCount={reminderCount}
        onClose={() => setShowReminderConfirm(false)}
        onConfirm={() => {
          if (activeSurvey) void sendReminders(activeSurvey.id, prefs);
          setShowReminderConfirm(false);
        }}
      />

      <FeedbackRegenerateConfirmDrawer
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          if (activeSurvey) void regenerateGoogleForm(activeSurvey.id);
          setShowRegenerateConfirm(false);
        }}
      />
    </div>
  );
}

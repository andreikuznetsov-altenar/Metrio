import { useEffect, useMemo, useState } from 'react';
import { getSurveyMetrics, useFeedbackSurveyStore } from '../../app/feedbackSurveyStore';
import { useFeedbackAppStore } from '../../app/FeedbackTeamProvider';
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
import { FEEDBACK_TABS, type FeedbackTab, hasGoogleAccount, isGoogleReadyForSurveys } from './feedbackUi';
import { GoogleConnectionPanel } from './GoogleConnectionPanel';
import { FeedbackSurveySetup } from './FeedbackSurveySetup';
import { FeedbackSurveyContent } from './FeedbackSurveyContent';
import { FeedbackSurveyReady } from './FeedbackSurveyReady';
import { FeedbackDeliveryView } from './FeedbackDeliveryView';
import { FeedbackResultsView } from './FeedbackResultsView';
import { FeedbackHistoryView } from './FeedbackHistoryView';
import { FeedbackRecipientsDrawer } from './FeedbackRecipientsDrawer';
import {
  FeedbackRegenerateConfirmDrawer,
  FeedbackReminderConfirmDrawer,
  FeedbackSendConfirmDrawer,
} from './FeedbackConfirmDrawers';

function formatLastSync(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.slice(0, 16).replace('T', ' ');
}

export function FeedbackPage() {
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
  const [editingDefaults, setEditingDefaults] = useState(true);
  const [formDetailsOpen, setFormDetailsOpen] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

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

  const alreadySentCount = activeSurvey
    ? activeSurvey.recipients.filter((r) => r.status === 'sent' || r.status === 'responded').length
    : 0;

  const missingEmailCount = counts?.missingEmail ?? 0;

  const primaryStatus = useMemo(() => {
    if (loading) return { variant: 'loading' as const, text: 'Working…' };
    if (error) return { variant: 'error' as const, text: error };
    if (prepareIssues.length > 0) {
      return { variant: 'error' as const, text: prepareIssues.map((i) => i.message).join(' ') };
    }
    if (testSentMessage) return { variant: 'success' as const, text: testSentMessage };
    if (sendSummary) return { variant: 'success' as const, text: sendSummary };
    return null;
  }, [loading, error, prepareIssues, testSentMessage, sendSummary]);

  const handleGoogleConnect = async (input: { webAppUrl: string; bridgeSecret: string }) => {
    setGoogleMessage(null);
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
    setGoogleMessage(`Connected as ${status.accountEmail}`);
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
    setGoogleMessage('Disconnected');
  };

  const runPrepareSurvey = async () => {
    setTestSentMessage(null);
    await prepareSurvey({
      prefs,
      teamSnapshot,
      teamDetection,
      dateFrom,
      dateTo,
      scope,
      projects: projectsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    });
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
            <section className="ds-section">
              <header className="ds-section__header">
                <h2 className="ds-section__title">Feedback</h2>
              </header>
              <div className="ds-section__body">
                <p className="ds-feedback-empty-inline">No personal feedback is available yet.</p>
              </div>
            </section>
          </div>
        </MetrioScrollArea>
      </div>
    );
  }

  if (!googleLinked) {
    return (
      <div className="ds-feedback-page-shell">
        <MetrioScrollArea className="ds-feedback-scroll">
          <div className="metrio-canvas ds-feedback-canvas">
            <GoogleConnectionPanel
              prefs={prefs}
              loading={loading}
              message={googleMessage}
              onConnect={handleGoogleConnect}
              onReconnect={handleGoogleConnect}
              onDisconnect={handleGoogleDisconnect}
              onUpdatePrefs={async (patch) => updatePrefs({ google: { ...prefs.google, ...patch } })}
            />
          </div>
        </MetrioScrollArea>
      </div>
    );
  }

  const footerAction =
    tab === 'survey'
      ? (
        <Button disabled={loading || !googleSurveyReady} onClick={() => runPrepareSurvey()}>
          {loading ? 'Preparing…' : 'Prepare survey'}
        </Button>
      )
      : (
        <Button
          variant="secondary"
          disabled={!activeSurvey || loading}
          onClick={() => activeSurvey && syncResponses(activeSurvey.id)}
        >
          Refresh responses
        </Button>
      );

  const lastResponseSync = activeSurvey?.lastResponseSyncAt || null;

  return (
    <div className="ds-feedback-page-shell">
      <MetrioScrollArea className="ds-feedback-scroll">
        <div className="metrio-canvas ds-feedback-canvas">
          <div className="ds-feedback-stack">
            <GoogleConnectionPanel
              prefs={prefs}
              loading={loading}
              message={googleMessage}
              mode="feedback"
              onConnect={handleGoogleConnect}
              onReconnect={handleGoogleConnect}
              onDisconnect={handleGoogleDisconnect}
              onUpdatePrefs={async (patch) => updatePrefs({ google: { ...prefs.google, ...patch } })}
            />

            {primaryStatus && (
              <StatusBanner variant={primaryStatus.variant}>{primaryStatus.text}</StatusBanner>
            )}

            {googleSurveyReady && (
              <>
                <Segmented tabs={FEEDBACK_TABS} active={tab} onChange={(id) => setTab(id as FeedbackTab)} />

                {tab === 'survey' && (
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
                        selectedSendCount={selectedSendCount}
                        formDetailsOpen={formDetailsOpen}
                        onToggleFormDetails={() => setFormDetailsOpen((v) => !v)}
                        onReviewRecipients={() => setShowRecipients(true)}
                        onSendTest={async () => {
                          setTestSentMessage(null);
                          await sendTestEmail(activeSurvey.id, prefs);
                          setTestSentMessage(
                            `Test email sent to ${prefs.google.accountEmail || 'your connected Google account'}.`,
                          );
                        }}
                        onSendSurvey={() => setShowSendConfirm(true)}
                        onRegenerate={() => setShowRegenerateConfirm(true)}
                      />
                    )}
                  </>
                )}

                {tab === 'delivery' && activeSurvey && counts && (
                  <FeedbackDeliveryView
                    counts={counts}
                    reminderCount={reminderCount}
                    onReviewRecipients={() => setShowRecipients(true)}
                    onRefreshResponses={() => syncResponses(activeSurvey.id)}
                    onSendReminder={() => setShowReminderConfirm(true)}
                  />
                )}

                {tab === 'delivery' && !activeSurvey && (
                  <section className="ds-section">
                    <div className="ds-section__body">
                      <p className="ds-feedback-empty-inline">Prepare a survey to track delivery.</p>
                    </div>
                  </section>
                )}

                {tab === 'results' && metrics && metrics.respondentCount > 0 && (
                  <FeedbackResultsView metrics={metrics} />
                )}

                {tab === 'results' && (!metrics || metrics.respondentCount === 0) && (
                  <section className="ds-section">
                    <div className="ds-section__body">
                      <p className="ds-feedback-empty-inline">No survey responses yet.</p>
                    </div>
                  </section>
                )}

                {tab === 'history' && (
                  <FeedbackHistoryView
                    surveys={data.surveys}
                    activeSurveyId={data.activeSurveyId}
                    onSelectSurvey={(id) => {
                      setActiveSurvey(id);
                      setTab('survey');
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </MetrioScrollArea>

      {googleSurveyReady && (
        <StickyActionBar
          left={<span>Last response sync: {formatLastSync(lastResponseSync)}</span>}
          right={footerAction}
        />
      )}

      {activeSurvey && (
        <FeedbackRecipientsDrawer
          open={showRecipients}
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
        accountEmail={prefs.google.accountEmail}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={() => {
          if (activeSurvey) sendSurveyBatch(activeSurvey.id, prefs);
          setShowSendConfirm(false);
        }}
      />

      <FeedbackReminderConfirmDrawer
        open={showReminderConfirm}
        reminderCount={reminderCount}
        onClose={() => setShowReminderConfirm(false)}
        onConfirm={() => {
          if (activeSurvey) sendReminders(activeSurvey.id, prefs);
          setShowReminderConfirm(false);
        }}
      />

      <FeedbackRegenerateConfirmDrawer
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          if (activeSurvey) regenerateGoogleForm(activeSurvey.id);
          setShowRegenerateConfirm(false);
        }}
      />
    </div>
  );
}

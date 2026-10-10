import { useEffect, useMemo, useState } from 'react';
import { getSurveyMetrics, useFeedbackSurveyStore } from '../../app/feedbackSurveyStore';
import { useFeedbackAppStore } from '../../app/FeedbackTeamProvider';
import { useToast } from '../../components/Toast/ToastContext';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { getTodayIsoDate } from '../../domain/jira/dates';
import { canManageFeedbackCycles } from '../../domain/feedbackCycles/feedbackRecipients';
import { isFeedbackBridgeReady } from '../../domain/feedbackV2/bridgeReady';
import { recipientsFromTeamMembers } from '../../domain/feedbackV2/recipients';
import { resolveOrgFeatureAccess } from '../../domain/organization/orgFeatureAccess';
import { useCurrentUser } from '../../app/CurrentUserContext';
import { Button, Drawer, MetrioScrollArea, StatusBanner } from './design-system';
import '../page-content.css';
import { formatGoogleOAuthError } from './feedbackUi';
import { FeedbackBridgeSetupDrawer } from './FeedbackBridgeSetupDrawer';
import { FeedbackCyclesLanding } from './FeedbackCyclesLanding';
import { FeedbackCycleDetailView } from './FeedbackCycleDetailView';
import { FeedbackNewSurveyDrawer } from './FeedbackNewSurveyDrawer';
import { FeedbackRunWorkspace } from './FeedbackRunWorkspace';
import { FeedbackResultsView } from './FeedbackResultsView';

function FeedbackPageSkeleton() {
  return (
    <div className="ds-feedback-stack">
      <Skeleton height={40} className="feedback-skeleton-strip" />
      <Skeleton height={120} />
      <Skeleton height={200} />
    </div>
  );
}

type Screen =
  | { kind: 'landing' }
  | { kind: 'cycle'; cycleId: string }
  | { kind: 'run'; cycleId: string; runId: string };

export function FeedbackPage() {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const orgAccess = resolveOrgFeatureAccess(currentUser.orgRole ?? 'unresolved');
  const { prefs, teamDetection, teamSnapshot, updatePrefs } = useFeedbackAppStore();
  const surveyStore = useFeedbackSurveyStore();
  const {
    data,
    loading,
    error,
    init,
    connectGoogle,
    createFeedbackSurvey,
    repeatFeedbackCycleRun,
    deleteFeedbackCycle,
    closeSurvey,
    sendSurveyBatch,
    syncResponses,
    setShowSendConfirm,
    showSendConfirm,
  } = surveyStore;

  const isTeamMode =
    teamDetection?.mode === 'team' && orgAccess.canViewSurveyManagement;
  const canManage = canManageFeedbackCycles(currentUser);
  const bridgeReady = isFeedbackBridgeReady(prefs);

  const [screen, setScreen] = useState<Screen>({ kind: 'landing' });
  const [initializing, setInitializing] = useState(true);
  const [bridgeSetupOpen, setBridgeSetupOpen] = useState(false);
  const [newSurveyOpen, setNewSurveyOpen] = useState(false);
  const [repeatCycleId, setRepeatCycleId] = useState<string | null>(null);
  const [webAppUrl, setWebAppUrl] = useState(prefs.google.appsScriptWebAppUrl);

  useEffect(() => {
    init().finally(() => setInitializing(false));
  }, [init]);

  useEffect(() => {
    if (!bridgeReady && canManage) {
      setBridgeSetupOpen(true);
    }
  }, [bridgeReady, canManage]);

  const teamMembers = teamSnapshot?.persons ?? [];
  const dateFrom = prefs.reportFilters.dateFrom;
  const dateTo = prefs.reportFilters.dateTo || getTodayIsoDate();
  const scope = prefs.reportFilters.teamScope;
  const projects = prefs.reportFilters.projects;

  const activeRun = useMemo(() => {
    if (screen.kind !== 'run') return null;
    return data.surveys.find((s) => s.id === screen.runId) ?? null;
  }, [data.surveys, screen]);

  const selectedCycle = useMemo(() => {
    if (screen.kind === 'landing') return null;
    const cycleId = screen.kind === 'cycle' ? screen.cycleId : screen.cycleId;
    return (data.cycles ?? []).find((c) => c.id === cycleId) ?? null;
  }, [data.cycles, screen]);

  const detailDrawerTitle =
    screen.kind === 'run'
      ? activeRun?.title ?? 'Feedback run'
      : selectedCycle?.name ?? 'Feedback cycle';

  const closeDetailDrawer = () => setScreen({ kind: 'landing' });

  const handleBridgeConnect = async (input: { webAppUrl: string; bridgeSecret: string }) => {
    const status = await connectGoogle(input);
    await updatePrefs({
      google: {
        ...prefs.google,
        accountEmail: status.accountEmail,
        formsConnected: status.formsConnected,
        gmailConnected: status.gmailConnected,
        calendarConnected: status.calendarConnected,
        appsScriptWebAppUrl: input.webAppUrl.trim(),
        responseAccess: 'anyone_with_link',
        emailCollectionMode: 'RESPONDER_INPUT',
      },
    });
    toast.success('Google Forms bridge connected');
  };

  const submitNewSurvey = async (input: {
    title: string;
    introText: string;
    emailSubject: string;
    questions: import('../../domain/survey/types').SurveyQuestion[];
    recipientPersonIds: string[];
  }) => {
    const recipients = recipientsFromTeamMembers(teamMembers, input.recipientPersonIds);
    if (repeatCycleId) {
      await repeatFeedbackCycleRun(repeatCycleId, {
        title: input.title,
        introText: input.introText,
        emailSubject: input.emailSubject,
        questions: input.questions,
        recipients,
        dateFrom,
        dateTo,
        scope,
        projects,
      });
      toast.success('New run created');
    } else {
      await createFeedbackSurvey({
        title: input.title,
        introText: input.introText,
        emailSubject: input.emailSubject,
        questions: input.questions,
        recipients,
        dateFrom,
        dateTo,
        scope,
        projects,
      });
      toast.success('Survey created');
    }
    setNewSurveyOpen(false);
    setRepeatCycleId(null);
  };

  if (!isTeamMode) {
    if (orgAccess.canViewOwnFeedbackResults) {
      const metrics = getSurveyMetrics(data);
      return (
        <div className="ds-feedback-page-shell" data-testid="feedback-ic-results-only">
          <MetrioScrollArea className="ds-feedback-scroll">
            <div className="metrio-canvas ds-feedback-canvas">
              {metrics ? (
                <FeedbackResultsView metrics={metrics} sentCount={0} />
              ) : (
                <p className="ds-feedback-empty-inline">No feedback results yet.</p>
              )}
            </div>
          </MetrioScrollArea>
        </div>
      );
    }
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

  return (
    <div className="ds-feedback-page-shell" data-testid="feedback-v2-page">
      <MetrioScrollArea className="ds-feedback-scroll">
        <div className="metrio-canvas ds-feedback-canvas page-content ds-feedback-page">
          {initializing ? (
            <FeedbackPageSkeleton />
          ) : (
            <div className="ds-feedback-stack">
              {error ? (
                <StatusBanner tone="danger">{formatGoogleOAuthError(error)}</StatusBanner>
              ) : null}

              {!bridgeReady && canManage ? (
                <StatusBanner tone="info">
                  <div className="feedback-integration-notice">
                    <div>
                      <strong>Google Forms is not connected.</strong>
                      <span>Set up the Apps Script bridge to create and send this survey.</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => setBridgeSetupOpen(true)}
                    >
                      Set up Google Forms
                    </Button>
                  </div>
                </StatusBanner>
              ) : null}

              <FeedbackCyclesLanding
                data={data}
                canManage={canManage}
                onNewSurvey={() => {
                  if (!bridgeReady) {
                    setBridgeSetupOpen(true);
                    return;
                  }
                  setRepeatCycleId(null);
                  setNewSurveyOpen(true);
                }}
                onOpenCycle={(cycleId) => setScreen({ kind: 'cycle', cycleId })}
                onOpenRun={(cycleId, runId) => setScreen({ kind: 'run', cycleId, runId })}
                onStopRun={(runId) => void closeSurvey(runId).then(() => toast.info('Run stopped'))}
                onRepeatCycle={(cycleId) => {
                  if (!bridgeReady) {
                    setBridgeSetupOpen(true);
                    return;
                  }
                  setRepeatCycleId(cycleId);
                  setNewSurveyOpen(true);
                }}
                onDeleteCycle={(cycleId) =>
                  void deleteFeedbackCycle(cycleId).then(() => toast.info('Cycle deleted'))
                }
              />
            </div>
          )}
        </div>
      </MetrioScrollArea>

      <Drawer
        open={screen.kind !== 'landing'}
        size="analytics"
        title={detailDrawerTitle}
        onClose={closeDetailDrawer}
      >
        {screen.kind === 'cycle' && selectedCycle ? (
          <FeedbackCycleDetailView
            cycle={selectedCycle}
            data={data}
            canManage={canManage}
            onOpenRun={(runId) =>
              setScreen({ kind: 'run', cycleId: selectedCycle.id, runId })
            }
            onStopRun={(runId) => void closeSurvey(runId).then(() => toast.info('Run stopped'))}
            onRepeatCycle={(cycleId) => {
              if (!bridgeReady) {
                setBridgeSetupOpen(true);
                return;
              }
              setRepeatCycleId(cycleId);
              setNewSurveyOpen(true);
            }}
          />
        ) : null}

        {screen.kind === 'run' && activeRun ? (
          <FeedbackRunWorkspace
            run={activeRun}
            loading={loading}
            onSend={() => sendSurveyBatch(activeRun.id, prefs)}
            onSync={() => syncResponses(activeRun.id)}
            onStop={() => closeSurvey(activeRun.id)}
            showSendConfirm={showSendConfirm}
            onShowSendConfirm={setShowSendConfirm}
          />
        ) : null}
      </Drawer>

      <FeedbackBridgeSetupDrawer
        open={bridgeSetupOpen}
        webAppUrl={webAppUrl}
        onWebAppUrlChange={setWebAppUrl}
        onClose={() => setBridgeSetupOpen(false)}
        onTestConnection={handleBridgeConnect}
      />

      <FeedbackNewSurveyDrawer
        open={newSurveyOpen}
        mode={repeatCycleId ? 'repeat' : 'create'}
        teamMembers={teamMembers}
        busy={loading}
        onClose={() => {
          setNewSurveyOpen(false);
          setRepeatCycleId(null);
        }}
        onSubmit={submitNewSurvey}
      />
    </div>
  );
}

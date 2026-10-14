import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuditIssue } from '../domain/jira/types';
import { resolveCatalogIssue } from '../domain/jira/issueCatalog';
import { TaskJourneyDrawer } from '../components/TaskJourney/TaskJourneyDrawer';
import { useOptionalPerformanceData } from './PerformanceDataContext';
import {
  getIssueCompletionService,
  type IssueCompletionService,
} from '../services/jira/issueCompletionService';
import {
  applyVerifiedIssueState,
  type VerifiedIssueState,
} from '../domain/jira/applyVerifiedIssueState';
import { useOperationalRules } from './OperationalRulesContext';

interface TaskJourneyContextValue {
  openTaskJourney: (issueOrKey: AuditIssue | string) => void;
  closeTaskJourney: () => void;
}

const TaskJourneyContext = createContext<TaskJourneyContextValue | null>(null);

export function TaskJourneyProvider({ children }: { children: ReactNode }) {
  const performance = useOptionalPerformanceData();
  const { rules } = useOperationalRules();
  const [issue, setIssue] = useState<AuditIssue | null>(null);
  const [open, setOpen] = useState(false);
  const [completionService, setCompletionService] = useState<IssueCompletionService | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getIssueCompletionService()
      .then((service) => {
        if (!cancelled) setCompletionService(service);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const applyVerifiedIssue = performance?.applyVerifiedIssue;
  const handleIssueVerified = useCallback(
    (verified: VerifiedIssueState) => {
      applyVerifiedIssue?.(verified);
      setIssue((current) =>
        current && current.issueKey === verified.issueKey
          ? applyVerifiedIssueState(current, verified)
          : current,
      );
    },
    [applyVerifiedIssue],
  );

  const catalog = performance?.issueCatalog;
  const params = performance?.data?.reportData.params;
  const persons = performance?.data?.teamSnapshot.persons;
  const dependencyIndex = performance?.data?.dependencyIndex;

  const openTaskJourney = useCallback(
    (issueOrKey: AuditIssue | string) => {
      const resolved =
        typeof issueOrKey === 'string'
          ? resolveCatalogIssue(catalog, issueOrKey)
          : issueOrKey;
      if (!resolved) return;
      setIssue(resolved);
      setOpen(true);
    },
    [catalog],
  );

  const closeTaskJourney = useCallback(() => {
    setOpen(false);
  }, []);

  const blockerKey =
    issue && dependencyIndex?.activeBlockersByIssue[issue.issueKey]?.[0]?.targetIssueKey;
  const dependencyBlockerKey = blockerKey ?? undefined;

  const value = useMemo(
    () => ({ openTaskJourney, closeTaskJourney }),
    [openTaskJourney, closeTaskJourney],
  );

  return (
    <TaskJourneyContext.Provider value={value}>
      {children}
      {params ? (
        <TaskJourneyDrawer
          open={open}
          issue={issue}
          params={params}
          rules={rules}
          persons={persons}
          dependencyBlockerKey={dependencyBlockerKey}
          completionService={completionService ?? undefined}
          onIssueVerified={handleIssueVerified}
          onClose={closeTaskJourney}
        />
      ) : null}
    </TaskJourneyContext.Provider>
  );
}

export function useTaskJourney(): TaskJourneyContextValue {
  const ctx = useContext(TaskJourneyContext);
  if (!ctx) {
    throw new Error('useTaskJourney must be used within TaskJourneyProvider');
  }
  return ctx;
}

export function useOptionalTaskJourney(): TaskJourneyContextValue | null {
  return useContext(TaskJourneyContext);
}

/** TaskListModal / GroupedIssuePreview callback shape. */
export function useOpenTaskJourneyFromKey(): (issueKey: string, url?: string) => void {
  const { openTaskJourney } = useTaskJourney();
  return (issueKey: string) => {
    openTaskJourney(issueKey);
  };
}

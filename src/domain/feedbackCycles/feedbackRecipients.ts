import type { Person } from '../people/types';
import type { AudienceRule } from './feedbackCycleTypes';
import type { CurrentUser } from '../types';
export interface RecipientGenerationInput {
  rule: AudienceRule;
  currentUser: CurrentUser;
  teamPersons: Person[];
  /** Never use full org — only direct scope persons */
  directScopePersons: Person[];
}

export function generateAudiencePersonIds(input: RecipientGenerationInput): string[] {
  const { rule, currentUser, directScopePersons } = input;
  const directIds = new Set(
    currentUser.team?.directReportIds ?? [],
  );

  switch (rule.kind) {
    case 'self':
      return [currentUser.person.id];
    case 'direct_reports':
      return [...directIds];
    case 'selected_people':
      return (rule.personIds ?? []).filter((id) =>
        id === currentUser.person.id || directIds.has(id),
      );
    case 'team_direct_scope':
      return directScopePersons.map((p) => p.id);
    case 'new_starter': {
      const days = rule.onboardingDays ?? [30];
      const today = new Date();
      return directScopePersons
        .filter((p) => {
          const hire = p.bamboo.hireDate;
          if (!hire) return false;
          const elapsed = Math.round(
            (today.getTime() - new Date(hire).getTime()) / 86_400_000,
          );
          return days.includes(elapsed);
        })
        .map((p) => p.id);
    }
    case 'project_participants':
      if (!rule.projectKeys?.length) return [];
      const keys = new Set(rule.projectKeys.map((k) => k.toUpperCase()));
      return directScopePersons
        .filter((p) =>
          p.issues.some((i) =>
            keys.has(i.issueKey.split('-')[0]?.toUpperCase() ?? ''),
          ),
        )
        .map((p) => p.id);
    default:
      return [];
  }
}

export function canManageFeedbackCycles(currentUser: CurrentUser): boolean {
  return (
    currentUser.orgRole === "leaf_manager" &&
    Boolean(currentUser.team?.directReportIds.length)
  );
}

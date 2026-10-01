export type {
  OrgResolutionResult as TeamDetectionResult,
  ResolvedEmployee as BambooEmployee,
  ReportingSource,
  TeamMode,
} from './orgResolver';
export { resolveOrganization as detectTeam } from './orgResolver';

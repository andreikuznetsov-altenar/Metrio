import type { BambooClient, BambooEmployeeRecord } from './bambooClient';
import { isFieldRestricted, parseListEmployeesPage } from './listEmployees';
import { normalizePersonName } from './bambooClient';

export type TeamMode = 'team' | 'personal' | 'personal_limited' | 'unknown';
export type ReportingSource = 'id' | 'email' | 'directory_supervisor' | 'unknown';

export interface ResolvedEmployee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  supervisorId?: string;
  supervisorEmail?: string;
  status: string;
}

export interface OrgResolutionResult {
  ok: boolean;
  mode: TeamMode;
  employee?: ResolvedEmployee;
  directReports: ResolvedEmployee[];
  fullTeam: ResolvedEmployee[];
  missingFields: string[];
  restrictedFields: string[];
  diagnostics: string[];
  reportingSource: ReportingSource;
  ambiguousSupervisorNames: number;
  error?: string;
}

const EMPLOYEE_FIELDS = [
  'workEmail',
  'supervisorEId',
  'supervisorEmail',
  'jobTitle',
  'displayName',
  'firstName',
  'lastName',
  'status',
];

function isActive(status: string | undefined): boolean {
  const s = String(status || 'active').toLowerCase();
  return s !== 'inactive' && s !== 'terminated' && s !== 'inactive employee';
}

function resolveEmail(emp: BambooEmployeeRecord): string {
  return String(emp.workEmail || emp.email || emp.bestEmail || '').trim();
}

function getDisplayName(emp: BambooEmployeeRecord): string {
  return (
    emp.displayName ||
    [emp.firstName, emp.lastName].filter(Boolean).join(' ') ||
    'Unknown'
  );
}

function toResolved(emp: BambooEmployeeRecord, details?: Record<string, string>): ResolvedEmployee {
  return {
    id: String(emp.id || details?.id || ''),
    displayName: details?.displayName || getDisplayName(emp),
    firstName: details?.firstName || emp.firstName || '',
    lastName: details?.lastName || emp.lastName || emp.surname || '',
    workEmail: details?.workEmail || resolveEmail(emp),
    jobTitle: details?.jobTitle || emp.jobTitle || '',
    supervisorId: details?.supervisorEId || (emp.supervisorEId ?? undefined) || undefined,
    supervisorEmail: details?.supervisorEmail || emp.supervisorEmail || undefined,
    status: details?.status || emp.status || 'active',
  };
}

export function findAllByWorkEmail(
  employees: BambooEmployeeRecord[],
  email: string,
): BambooEmployeeRecord[] {
  const target = email.trim().toLowerCase();
  return employees.filter((e) => resolveEmail(e).toLowerCase() === target);
}

function hasFieldData(employees: BambooEmployeeRecord[], field: keyof BambooEmployeeRecord): boolean {
  return employees.some((e) => e[field] !== undefined && e[field] !== null && e[field] !== '');
}

function getDirectReportsByIdOrEmail(
  employees: BambooEmployeeRecord[],
  managerId: string,
  canUseSupervisorId: boolean,
  managerEmail?: string,
): BambooEmployeeRecord[] {
  return employees.filter((e) => {
    if (!isActive(e.status)) return false;
    if (canUseSupervisorId && e.supervisorEId) {
      return String(e.supervisorEId) === String(managerId);
    }
    if (managerEmail && e.supervisorEmail) {
      return e.supervisorEmail.trim().toLowerCase() === managerEmail.trim().toLowerCase();
    }
    return false;
  });
}

function buildFullTeamByIdOrEmail(
  employees: BambooEmployeeRecord[],
  rootId: string,
  canUseSupervisorId: boolean,
  rootEmail?: string,
): ResolvedEmployee[] {
  const result: ResolvedEmployee[] = [];
  const visited = new Set<string>();

  function walk(managerId: string, managerEmail?: string) {
    const reports = getDirectReportsByIdOrEmail(employees, managerId, canUseSupervisorId, managerEmail);
    for (const emp of reports) {
      const id = String(emp.id);
      if (visited.has(id)) continue;
      visited.add(id);
      const resolved = toResolved(emp);
      if (!isActive(resolved.status)) continue;
      result.push(resolved);
      walk(id, resolved.workEmail);
    }
  }

  walk(rootId, rootEmail);
  return result;
}

export function buildActiveNameIndex(
  employees: BambooEmployeeRecord[],
): Map<string, BambooEmployeeRecord[]> {
  const index = new Map<string, BambooEmployeeRecord[]>();
  for (const emp of employees) {
    if (!isActive(emp.status)) continue;
    const normalized = normalizePersonName(getDisplayName(emp));
    if (!normalized) continue;
    const bucket = index.get(normalized) || [];
    bucket.push(emp);
    index.set(normalized, bucket);
  }
  return index;
}

export function getAmbiguousNormalizedNames(index: Map<string, BambooEmployeeRecord[]>): Set<string> {
  const ambiguous = new Set<string>();
  for (const [name, matches] of index.entries()) {
    if (matches.length > 1) ambiguous.add(name);
  }
  return ambiguous;
}

export function hasDirectorySupervisorData(employees: BambooEmployeeRecord[]): boolean {
  return employees.some(
    (e) => isActive(e.status) && typeof e.supervisor === 'string' && e.supervisor.trim().length > 0,
  );
}

export function mergeDirectoryIntoRoster(
  listRoster: BambooEmployeeRecord[],
  directory: BambooEmployeeRecord[],
): BambooEmployeeRecord[] {
  const byId = new Map<string, BambooEmployeeRecord>();
  const byEmail = new Map<string, BambooEmployeeRecord>();
  const byName = new Map<string, BambooEmployeeRecord[]>();

  for (const entry of directory) {
    const id = String(entry.id || '');
    if (id) byId.set(id, entry);
    const email = resolveEmail(entry).toLowerCase();
    if (email) byEmail.set(email, entry);
    const normalizedName = normalizePersonName(getDisplayName(entry));
    if (normalizedName) {
      const bucket = byName.get(normalizedName) || [];
      bucket.push(entry);
      byName.set(normalizedName, bucket);
    }
  }

  const findDirectoryMatch = (emp: BambooEmployeeRecord): BambooEmployeeRecord | undefined => {
    const id = String(emp.id || '');
    if (id && byId.has(id)) return byId.get(id);

    const email = resolveEmail(emp).toLowerCase();
    if (email && byEmail.has(email)) return byEmail.get(email);

    const normalizedName = normalizePersonName(getDisplayName(emp));
    if (normalizedName) {
      const candidates = byName.get(normalizedName) || [];
      if (candidates.length === 1) return candidates[0];
    }
    return undefined;
  };

  return listRoster.map((emp) => {
    const match = findDirectoryMatch(emp);
    if (!match?.supervisor?.trim()) return emp;
    return { ...emp, supervisor: match.supervisor.trim() };
  });
}

export function getDirectReportsBySupervisorName(
  employees: BambooEmployeeRecord[],
  managerDisplayName: string,
  ambiguousNames: Set<string>,
): BambooEmployeeRecord[] {
  const managerNorm = normalizePersonName(managerDisplayName);
  if (!managerNorm || ambiguousNames.has(managerNorm)) return [];

  return employees.filter((e) => {
    if (!isActive(e.status)) return false;
    if (!e.supervisor?.trim()) return false;
    const supervisorNorm = normalizePersonName(e.supervisor);
    if (!supervisorNorm || ambiguousNames.has(supervisorNorm)) return false;
    return supervisorNorm === managerNorm;
  });
}

export function buildFullTeamBySupervisorName(
  employees: BambooEmployeeRecord[],
  rootDisplayName: string,
  ambiguousNames: Set<string>,
): ResolvedEmployee[] {
  const rootNorm = normalizePersonName(rootDisplayName);
  if (!rootNorm || ambiguousNames.has(rootNorm)) return [];

  const result: ResolvedEmployee[] = [];
  const visited = new Set<string>();

  function walk(managerDisplayName: string) {
    const reports = getDirectReportsBySupervisorName(employees, managerDisplayName, ambiguousNames);
    for (const emp of reports) {
      const id = String(emp.id);
      if (visited.has(id)) continue;
      visited.add(id);
      const resolved = toResolved(emp);
      if (!isActive(resolved.status)) continue;
      result.push(resolved);
      walk(getDisplayName(emp));
    }
  }

  walk(rootDisplayName);
  return result;
}

function appendBambooDiagnostics(
  diagnostics: string[],
  input: {
    listCount: number;
    directoryCount: number;
    hasSupervisorIdField: boolean;
    hasSupervisorEmailField: boolean;
    directorySupervisorAvailable: boolean;
    reportingSource: ReportingSource;
    directReports: number;
    fullTeam: number;
    ambiguousSupervisorNames: number;
  },
): void {
  diagnostics.push(`List Employees loaded: ${input.listCount}`);
  diagnostics.push(`Directory loaded: ${input.directoryCount}`);
  diagnostics.push(`supervisorEId available: ${input.hasSupervisorIdField ? 'yes' : 'no'}`);
  diagnostics.push(`supervisorEmail available: ${input.hasSupervisorEmailField ? 'yes' : 'no'}`);
  diagnostics.push(`Directory supervisor available: ${input.directorySupervisorAvailable ? 'yes' : 'no'}`);
  diagnostics.push(`reporting source: ${input.reportingSource}`);
  diagnostics.push(`direct reports: ${input.directReports}`);
  diagnostics.push(`full team: ${input.fullTeam}`);
  diagnostics.push(`ambiguous supervisor names: ${input.ambiguousSupervisorNames}`);
}

async function loadEmployeeRoster(
  client: BambooClient,
  diagnostics: string[],
): Promise<{
  employees: BambooEmployeeRecord[];
  restrictedFieldsByEmployee: Record<string, string[]>;
  source: 'list' | 'directory';
}> {
  try {
    const list = await client.listAllEmployees(EMPLOYEE_FIELDS);
    if (list.employees.length) {
      diagnostics.push(`Loaded ${list.employees.length} employees from List Employees (${list.pages} page(s)).`);
      return {
        employees: list.employees,
        restrictedFieldsByEmployee: list.restrictedFieldsByEmployee,
        source: 'list',
      };
    }
  } catch (e) {
    diagnostics.push(
      `List Employees failed: ${e instanceof Error ? e.message : String(e)}. Falling back to directory.`,
    );
  }

  const directory = await client.getDirectory();
  diagnostics.push(`Loaded ${directory.length} employees from company directory fallback.`);
  return { employees: directory, restrictedFieldsByEmployee: {}, source: 'directory' };
}

export async function resolveOrganization(
  client: BambooClient,
  workEmail: string,
): Promise<OrgResolutionResult> {
  const diagnostics: string[] = [];
  const missingFields: string[] = [];
  const restrictedFields: string[] = [];

  if (!workEmail.trim()) {
    return {
      ok: false,
      mode: 'unknown',
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: 'Work email is required.',
    };
  }

  let roster: BambooEmployeeRecord[] = [];
  let restrictedMap: Record<string, string[]> = {};
  let listCount = 0;
  let directoryCount = 0;
  let rosterSource: 'list' | 'directory' = 'list';

  try {
    const loaded = await loadEmployeeRoster(client, diagnostics);
    roster = loaded.employees;
    restrictedMap = loaded.restrictedFieldsByEmployee;
    rosterSource = loaded.source;
    listCount = loaded.source === 'list' ? roster.length : 0;

    if (loaded.source === 'directory') {
      restrictedFields.push('listEmployees');
      directoryCount = roster.length;
    }
  } catch (e) {
    return {
      ok: false,
      mode: 'unknown',
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const emailMatches = findAllByWorkEmail(roster, workEmail);
  if (emailMatches.length === 0) {
    return {
      ok: false,
      mode: 'unknown',
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: `We connected to BambooHR, but couldn't find an employee with: ${workEmail}`,
    };
  }
  if (emailMatches.length > 1) {
    return {
      ok: false,
      mode: 'unknown',
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: `Multiple Bamboo employees match this work email (${emailMatches.length} records). Contact support.`,
    };
  }
  const match = emailMatches[0];

  let details: Record<string, string> = {};
  try {
    details = await client.getEmployee(String(match.id), EMPLOYEE_FIELDS);
  } catch {
    diagnostics.push('Could not load detailed employee record; using roster data.');
  }

  const employee = toResolved(match, details);

  if (!employee.workEmail) missingFields.push('workEmail');

  const hasWorkEmailField = hasFieldData(roster, 'workEmail');
  const hasSupervisorIdField =
    hasFieldData(roster, 'supervisorEId') &&
    !isFieldRestricted(restrictedMap, roster, 'supervisorEId');
  const hasSupervisorEmailField =
    hasFieldData(roster, 'supervisorEmail') &&
    !isFieldRestricted(restrictedMap, roster, 'supervisorEmail');

  if (!hasWorkEmailField) restrictedFields.push('workEmail');
  if (!hasSupervisorIdField) restrictedFields.push('supervisorEId');
  if (!hasSupervisorEmailField) restrictedFields.push('supervisorEmail');

  const canDetermineReportingByIdOrEmail = hasSupervisorIdField || hasSupervisorEmailField;

  if (canDetermineReportingByIdOrEmail) {
    const reportingSource: ReportingSource = hasSupervisorIdField ? 'id' : 'email';
    const directReportRows = getDirectReportsByIdOrEmail(
      roster,
      employee.id,
      hasSupervisorIdField,
      employee.workEmail,
    );
    const directReports = directReportRows.map((e) => toResolved(e)).filter((e) => isActive(e.status));
    const fullTeam = buildFullTeamByIdOrEmail(roster, employee.id, hasSupervisorIdField, employee.workEmail);

    appendBambooDiagnostics(diagnostics, {
      listCount: rosterSource === 'list' ? roster.length : 0,
      directoryCount,
      hasSupervisorIdField,
      hasSupervisorEmailField,
      directorySupervisorAvailable: false,
      reportingSource,
      directReports: directReports.length,
      fullTeam: fullTeam.length,
      ambiguousSupervisorNames: 0,
    });

    if (directReports.length > 0) {
      return {
        ok: true,
        mode: 'team',
        employee,
        directReports,
        fullTeam,
        missingFields,
        restrictedFields,
        diagnostics,
        reportingSource,
        ambiguousSupervisorNames: 0,
      };
    }

    return {
      ok: true,
      mode: 'personal',
      employee,
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource,
      ambiguousSupervisorNames: 0,
    };
  }

  let mergedRoster = roster;
  if (rosterSource === 'list') {
    try {
      const directory = await client.getDirectory();
      directoryCount = directory.length;
      diagnostics.push(`Loaded ${directory.length} employees from company directory for supervisor fallback.`);
      mergedRoster = mergeDirectoryIntoRoster(roster, directory);
    } catch (e) {
      diagnostics.push(
        `Company Directory fallback failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const directorySupervisorAvailable = hasDirectorySupervisorData(mergedRoster);
  if (!directorySupervisorAvailable) {
    appendBambooDiagnostics(diagnostics, {
      listCount,
      directoryCount,
      hasSupervisorIdField,
      hasSupervisorEmailField,
      directorySupervisorAvailable: false,
      reportingSource: 'unknown',
      directReports: 0,
      fullTeam: 0,
      ambiguousSupervisorNames: 0,
    });
    return {
      ok: false,
      mode: 'unknown',
      employee,
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource: 'unknown',
      ambiguousSupervisorNames: 0,
      error: 'Cannot determine reporting structure — supervisor fields are missing or restricted.',
    };
  }

  const nameIndex = buildActiveNameIndex(mergedRoster);
  const ambiguousNames = getAmbiguousNormalizedNames(nameIndex);
  const ambiguousSupervisorNames = ambiguousNames.size;
  const managerDisplayName = employee.displayName;

  if (ambiguousNames.has(normalizePersonName(managerDisplayName))) {
    diagnostics.push(`Ambiguous supervisor name: ${managerDisplayName}`);
    appendBambooDiagnostics(diagnostics, {
      listCount,
      directoryCount,
      hasSupervisorIdField,
      hasSupervisorEmailField,
      directorySupervisorAvailable: true,
      reportingSource: 'unknown',
      directReports: 0,
      fullTeam: 0,
      ambiguousSupervisorNames,
    });
    return {
      ok: false,
      mode: 'unknown',
      employee,
      directReports: [],
      fullTeam: [],
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource: 'unknown',
      ambiguousSupervisorNames,
      error: 'Cannot determine reporting structure — supervisor name is ambiguous in company directory.',
    };
  }

  const directReportRows = getDirectReportsBySupervisorName(
    mergedRoster,
    managerDisplayName,
    ambiguousNames,
  );
  const directReports = directReportRows.map((e) => toResolved(e)).filter((e) => isActive(e.status));
  const fullTeam = buildFullTeamBySupervisorName(mergedRoster, managerDisplayName, ambiguousNames);
  const reportingSource: ReportingSource = 'directory_supervisor';

  appendBambooDiagnostics(diagnostics, {
    listCount,
    directoryCount,
    hasSupervisorIdField,
    hasSupervisorEmailField,
    directorySupervisorAvailable: true,
    reportingSource,
    directReports: directReports.length,
    fullTeam: fullTeam.length,
    ambiguousSupervisorNames,
  });

  if (directReports.length > 0) {
    return {
      ok: true,
      mode: 'team',
      employee,
      directReports,
      fullTeam,
      missingFields,
      restrictedFields,
      diagnostics,
      reportingSource,
      ambiguousSupervisorNames,
    };
  }

  return {
    ok: true,
    mode: 'personal',
    employee,
    directReports: [],
    fullTeam: [],
    missingFields,
    restrictedFields,
    diagnostics,
    reportingSource,
    ambiguousSupervisorNames,
  };
}

export { normalizePersonName, parseListEmployeesPage };

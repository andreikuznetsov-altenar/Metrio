import type { BambooEmployeeRecord } from './bambooClient';

export interface BambooListEmployeesPage {
  employees: BambooEmployeeRecord[];
  restrictedFieldsByEmployee: Record<string, string[]>;
  nextPagePath?: string;
}

function fieldValue(record: Record<string, unknown>, key: string): string | undefined {
  const v = record[key];
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'object' && v !== null && 'value' in (v as object)) {
    return String((v as { value?: unknown }).value ?? '');
  }
  return String(v);
}

function normalizeRecord(raw: Record<string, unknown>): BambooEmployeeRecord {
  const id = String(raw.employeeId ?? raw.id ?? raw.employeeNumber ?? '');
  const restricted = Array.isArray(raw._restrictedFields)
    ? (raw._restrictedFields as string[])
    : [];

  const record: BambooEmployeeRecord = {
    id,
    displayName: fieldValue(raw, 'displayName'),
    firstName: fieldValue(raw, 'firstName'),
    lastName: fieldValue(raw, 'lastName') || fieldValue(raw, 'surname'),
    workEmail: fieldValue(raw, 'workEmail') || fieldValue(raw, 'bestEmail'),
    supervisorEId: fieldValue(raw, 'supervisorEId') ?? fieldValue(raw, 'supervisorId'),
    supervisorEmail: fieldValue(raw, 'supervisorEmail'),
    jobTitle: fieldValue(raw, 'jobTitle'),
    status: fieldValue(raw, 'status') || fieldValue(raw, 'employmentStatus'),
    _restrictedFields: restricted,
  };

  return record;
}

export function parseListEmployeesPage(page: unknown): BambooListEmployeesPage {
  const root = (page || {}) as Record<string, unknown>;
  const data = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.employees)
      ? root.employees
      : [];

  const employees: BambooEmployeeRecord[] = [];
  const restrictedFieldsByEmployee: Record<string, string[]> = {};

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = normalizeRecord(item as Record<string, unknown>);
    if (!record.id) continue;
    employees.push(record);
    if (record._restrictedFields?.length) {
      restrictedFieldsByEmployee[record.id] = record._restrictedFields;
    }
  }

  const meta = root.meta as Record<string, unknown> | undefined;
  const links = root._links as Record<string, unknown> | undefined;
  const nextPagePath =
    (typeof meta?.nextPageUrl === 'string' && meta.nextPageUrl) ||
    (typeof (links?.next as { href?: string } | undefined)?.href === 'string' &&
      (links?.next as { href: string }).href) ||
    undefined;

  return { employees, restrictedFieldsByEmployee, nextPagePath };
}

export function mergeListEmployeesPages(pages: BambooListEmployeesPage[]): {
  employees: BambooEmployeeRecord[];
  restrictedFieldsByEmployee: Record<string, string[]>;
} {
  const byId = new Map<string, BambooEmployeeRecord>();
  const restricted: Record<string, string[]> = {};

  for (const page of pages) {
    for (const emp of page.employees) {
      byId.set(emp.id, emp);
    }
    Object.assign(restricted, page.restrictedFieldsByEmployee);
  }

  return { employees: [...byId.values()], restrictedFieldsByEmployee: restricted };
}

export function isFieldRestricted(
  restrictedMap: Record<string, string[]>,
  employees: BambooEmployeeRecord[],
  field: keyof BambooEmployeeRecord,
): boolean {
  const globallyMissing = !employees.some(
    (e) => e[field] !== undefined && e[field] !== null && e[field] !== '',
  );
  if (globallyMissing) return true;
  const restrictedCount = Object.values(restrictedMap).filter((fields) =>
    fields.includes(String(field)),
  ).length;
  return restrictedCount > employees.length * 0.8;
}

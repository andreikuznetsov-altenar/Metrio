import { invoke } from '@tauri-apps/api/core';
import { parseInvokeError } from '../../platform/apiTypes';
import { mergeListEmployeesPages, parseListEmployeesPage } from './listEmployees';

export interface BambooClientConfig {
  subdomain: string;
}

export interface BambooEmployeeRecord {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  surname?: string;
  workEmail?: string;
  email?: string;
  bestEmail?: string;
  supervisorEId?: string | null;
  supervisorEmail?: string | null;
  supervisor?: string | null;
  jobTitle?: string;
  department?: string;
  hireDate?: string;
  status?: string;
  _restrictedFields?: string[];
}

async function invokeBamboo<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw parseInvokeError(e);
  }
}

export class BambooClient {
  constructor(private config: BambooClientConfig) {}

  private get nativeConfig() {
    return { subdomain: this.config.subdomain };
  }

  async testConnection(): Promise<{ ok: true }> {
    await invokeBamboo('bamboo_test_connection', { config: this.nativeConfig });
    return { ok: true };
  }

  async getDirectory(): Promise<BambooEmployeeRecord[]> {
    const result = await invokeBamboo<{ employees?: BambooEmployeeRecord[] }>(
      'bamboo_get_directory',
      { config: this.nativeConfig },
    );
    return (result.employees || []).map((e) => ({
      ...e,
      id: String(e.id),
      supervisor: e.supervisor ?? undefined,
      displayName:
        e.displayName ||
        [e.firstName, e.lastName].filter(Boolean).join(' ') ||
        undefined,
    }));
  }

  async listEmployeesPage(
    fields: string[],
    pagePath?: string,
  ): Promise<ReturnType<typeof parseListEmployeesPage>> {
    const result = await invokeBamboo<{ page: unknown; next_page_path?: string }>(
      'bamboo_list_employees',
      {
        config: this.nativeConfig,
        params: { fields: fields.join(','), page_path: pagePath || null },
      },
    );
    const parsed = parseListEmployeesPage(result.page);
    return {
      ...parsed,
      nextPagePath: result.next_page_path || parsed.nextPagePath,
    };
  }

  async listAllEmployees(fields: string[]): Promise<{
    employees: BambooEmployeeRecord[];
    restrictedFieldsByEmployee: Record<string, string[]>;
    pages: number;
  }> {
    const result = await invokeBamboo<{ records: unknown[]; pages: number }>(
      'bamboo_list_employees_all',
      {
        config: this.nativeConfig,
        params: { fields: fields.join(',') },
      },
    );
    const pages = result.records.map((record) =>
      parseListEmployeesPage({ data: [record] }),
    );
    const merged = mergeListEmployeesPages(pages);
    return {
      employees: merged.employees,
      restrictedFieldsByEmployee: merged.restrictedFieldsByEmployee,
      pages: result.pages,
    };
  }

  async listEmployees(fields: string[]): Promise<BambooEmployeeRecord[]> {
    const { employees } = await this.listAllEmployees(fields);
    return employees;
  }

  async getEmployee(employeeId: string, fields: string[]): Promise<Record<string, string>> {
    const result = await invokeBamboo<Record<string, string>>('bamboo_get_employee', {
      config: this.nativeConfig,
      employeeId,
      fields: fields.join(','),
    });
    return result;
  }

  async getWhosOut(start: string, end: string): Promise<unknown[]> {
    const result = await invokeBamboo<unknown[]>('bamboo_get_whos_out', {
      config: this.nativeConfig,
      start,
      end,
    });
    return Array.isArray(result) ? result : [];
  }
}

export function normalizePersonName(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

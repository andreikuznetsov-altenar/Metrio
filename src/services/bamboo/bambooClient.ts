import { invoke } from '@tauri-apps/api/core';
import type {
  BambooCreateGoalInput,
  BambooGoal,
  BambooGoalAlignmentOption,
  BambooGoalShareOption,
  BambooGoalStatusFilter,
  BambooUpdateGoalInput,
} from '../../domain/goals/bambooGoalTypes';
import {
  buildCreateGoalBody,
  buildSimpleProgressBody,
  buildUpdateGoalBody,
} from '../../domain/goals/bambooGoalPayloads';
import {
  normalizeAlignmentOptions,
  normalizeBambooGoal,
  normalizeBambooGoalList,
  normalizeShareOptions,
  parseCanCreateGoals,
} from '../../domain/goals/normalizeBambooGoal';
import { ApiError, parseInvokeError } from '../../platform/apiTypes';
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

export class BambooPermissionError extends ApiError {
  constructor(message = 'Goals aren\'t available with your BambooHR access.') {
    super({ code: 'bamboo_forbidden', message, status: 403 });
    this.name = 'BambooPermissionError';
  }
}

async function invokeBamboo<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    const err = parseInvokeError(e);
    if (err.status === 403) {
      throw new BambooPermissionError(err.message || undefined);
    }
    throw err;
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

  async listGoals(
    employeeId: string,
    filter: BambooGoalStatusFilter = 'status-inProgress',
  ): Promise<BambooGoal[]> {
    const result = await invokeBamboo<unknown>('bamboo_list_goals', {
      config: this.nativeConfig,
      params: { employee_id: employeeId, filter },
    });
    return normalizeBambooGoalList(result, employeeId);
  }

  async canCreateGoals(employeeId: string): Promise<boolean> {
    const result = await invokeBamboo<unknown>('bamboo_can_create_goals', {
      config: this.nativeConfig,
      params: { employee_id: employeeId },
    });
    return parseCanCreateGoals(result);
  }

  async getGoalAggregate(employeeId: string, goalId: string): Promise<BambooGoal | null> {
    const result = await invokeBamboo<unknown>('bamboo_get_goal_aggregate', {
      config: this.nativeConfig,
      params: { employee_id: employeeId, goal_id: goalId },
    });
    const root =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : null;
    const payload = root?.goal ?? result;
    return normalizeBambooGoal(payload, employeeId);
  }

  async createGoal(employeeId: string, input: BambooCreateGoalInput): Promise<BambooGoal | null> {
    const body = buildCreateGoalBody(employeeId, input);
    const result = await invokeBamboo<unknown>('bamboo_create_goal', {
      config: this.nativeConfig,
      params: { employee_id: employeeId, body },
    });
    const root =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : null;
    return normalizeBambooGoal(root?.goal ?? result, employeeId);
  }

  async updateGoal(
    employeeId: string,
    goalId: string,
    input: BambooUpdateGoalInput,
  ): Promise<BambooGoal | null> {
    const body = buildUpdateGoalBody(employeeId, input);
    const result = await invokeBamboo<unknown>('bamboo_update_goal', {
      config: this.nativeConfig,
      params: { employee_id: employeeId, goal_id: goalId, body },
    });
    const root =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : null;
    return normalizeBambooGoal(root?.goal ?? result, employeeId);
  }

  async updateGoalProgress(
    employeeId: string,
    goalId: string,
    percentComplete: number,
    completionDate?: string | null,
  ): Promise<unknown> {
    const body = buildSimpleProgressBody(percentComplete, completionDate);
    return invokeBamboo('bamboo_update_goal_progress', {
      config: this.nativeConfig,
      params: { employee_id: employeeId, goal_id: goalId, body },
    });
  }

  async updateMilestoneProgress(
    employeeId: string,
    goalId: string,
    milestoneId: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return invokeBamboo('bamboo_update_goal_milestone_progress', {
      config: this.nativeConfig,
      params: {
        employee_id: employeeId,
        goal_id: goalId,
        milestone_id: milestoneId,
        body,
      },
    });
  }

  async getGoalShareOptions(employeeId: string): Promise<BambooGoalShareOption[]> {
    const result = await invokeBamboo<unknown>('bamboo_goal_share_options', {
      config: this.nativeConfig,
      params: { employee_id: employeeId },
    });
    return normalizeShareOptions(result);
  }

  async getGoalAlignmentOptions(employeeId: string): Promise<BambooGoalAlignmentOption[]> {
    const result = await invokeBamboo<unknown>('bamboo_goal_alignment_options', {
      config: this.nativeConfig,
      params: { employee_id: employeeId },
    });
    return normalizeAlignmentOptions(result);
  }

  async deleteGoal(employeeId: string, goalId: string): Promise<void> {
    await invokeBamboo('bamboo_delete_goal', {
      config: this.nativeConfig,
      params: { employee_id: employeeId, goal_id: goalId },
    });
  }
}

export function normalizePersonName(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

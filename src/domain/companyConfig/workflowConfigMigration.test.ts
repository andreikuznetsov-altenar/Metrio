import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOW_MAPPINGS } from '../workflows/defaultWorkflowMappings';
import { buildDefaultCompanyConfig } from './buildDefaultCompanyConfig';
import { validateCompanyConfig } from './validateCompanyConfig';

describe('workflow config migration', () => {
  it('accepts configs without jiraWorkflowProfiles', () => {
    const base = buildDefaultCompanyConfig();
    const { jiraWorkflowProfiles: _removed, ...legacy } = base;
    const result = validateCompanyConfig(legacy);
    expect(result.ok).toBe(true);
    expect(result.config?.jiraWorkflowProfiles).toBeUndefined();
  });

  it('defaults builtin config with workflow profile mappings', () => {
    const config = buildDefaultCompanyConfig();
    expect(config.jiraWorkflowProfiles).toEqual(DEFAULT_WORKFLOW_MAPPINGS);
    expect(validateCompanyConfig(config).ok).toBe(true);
  });

  it('validates custom workflow profile mappings', () => {
    const config = buildDefaultCompanyConfig();
    config.jiraWorkflowProfiles = [{ projectKey: 'UX', profileId: 'ux' }];
    expect(validateCompanyConfig(config).ok).toBe(true);

    config.jiraWorkflowProfiles = [{ projectKey: '', profileId: 'ux' }];
    expect(validateCompanyConfig(config).ok).toBe(false);
  });
});

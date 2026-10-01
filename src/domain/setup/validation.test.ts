import { describe, expect, it } from 'vitest';
import { isAltenarWorkEmail, isValidWorkEmail, validateConnectInput } from './validation';

describe('setup validation', () => {
  it('accepts valid Altenar work email', () => {
    expect(isValidWorkEmail('name@altenar.com')).toBe(true);
    expect(isAltenarWorkEmail('Name@Altenar.com ')).toBe(true);
  });

  it('rejects non-Altenar email', () => {
    expect(isAltenarWorkEmail('user@gmail.com')).toBe(false);
    expect(isAltenarWorkEmail('not-an-email')).toBe(false);
  });

  it('requires all connect fields', () => {
    expect(
      validateConnectInput({
        workEmail: 'user@gmail.com',
        jiraToken: 'tok',
        bambooApiKey: 'key',
      }),
    ).toContain('@altenar.com');
    expect(
      validateConnectInput({ workEmail: 'a@altenar.com', jiraToken: '', bambooApiKey: 'key' }),
    ).toContain('Jira');
    expect(
      validateConnectInput({ workEmail: 'a@altenar.com', jiraToken: 'tok', bambooApiKey: '' }),
    ).toContain('Bamboo');
  });
});

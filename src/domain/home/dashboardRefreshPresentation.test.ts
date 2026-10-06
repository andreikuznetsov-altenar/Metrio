import { describe, expect, it } from 'vitest';
import { buildDashboardSyncStatus } from './dashboardSyncStatus';

describe('dashboard refresh presentation (UI11)', () => {
  it('does not append duplicate Refreshing copy while refreshing', () => {
    const status = buildDashboardSyncStatus({
      lastUpdatedAt: new Date().toISOString(),
      refreshing: true,
      stale: false,
      errorMessage: null,
    });
    expect(status).toBeNull();
  });
});

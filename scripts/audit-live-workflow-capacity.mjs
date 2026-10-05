#!/usr/bin/env node
/**
 * Read-only live Jira workflow/capacity audit.
 * Requires local Metrio prefs + Jira connection (Tauri invoke in vitest harness).
 *
 * Usage: METRIO_WORKFLOW_AUDIT=1 npm test -- src/domain/workflows/auditLiveWorkflowCapacity.real.test.ts
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['test', '--', 'src/domain/workflows/auditLiveWorkflowCapacity.real.test.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, METRIO_WORKFLOW_AUDIT: '1' },
  },
);

process.exit(result.status ?? 1);

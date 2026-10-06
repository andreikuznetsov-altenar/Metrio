#!/usr/bin/env node
/**
 * Real Bamboo org-role QA using local Metrio preferences (same path as Tauri app data).
 *
 * Usage: METRIO_ORG_ROLE_QA=1 npm run probe:org-role
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npm",
  ["test", "--", "src/domain/organization/orgRoleBambooQA.real.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, METRIO_ORG_ROLE_QA: "1" },
  },
);

process.exit(result.status ?? 1);

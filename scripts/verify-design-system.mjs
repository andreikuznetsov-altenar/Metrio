#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "npm",
  ["run", "verify:design-system"],
  { cwd: root, stdio: "inherit" },
);
process.exit(result.status ?? 1);

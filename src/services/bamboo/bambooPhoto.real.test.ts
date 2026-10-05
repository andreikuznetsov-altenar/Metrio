import { describe, expect, it } from "vitest";
import { getVersion } from "@tauri-apps/api/app";
import { probeBambooEmployeePhoto } from "./bambooPhotoProbe";
import { resolveBambooSubdomain } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { resetAvatarSession } from "./bambooAvatarService";

const runReal = process.env.METRIO_REAL_BAMBOO_PHOTO === "1";

async function isTauriDesktop(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

type ProbeTarget = {
  label: string;
  resolveId: () => Promise<{
    employeeId: string;
    subdomain: string;
    displayName?: string;
  } | null>;
};

const PROBE_TARGETS: ProbeTarget[] = [
  {
    label: "current user (prefs teamDetection)",
    resolveId: async () => {
      const prefs = await loadPreferences();
      const employee = prefs.teamDetection?.employee;
      const subdomain = resolveBambooSubdomain(prefs);
      return employee?.id && subdomain
        ? { employeeId: employee.id, subdomain, displayName: employee.displayName }
        : null;
    },
  },
  {
    label: "Daria Chernova (directory search)",
    resolveId: async () => {
      const prefs = await loadPreferences();
      const subdomain = resolveBambooSubdomain(prefs);
      if (!subdomain) return null;
      const { BambooClient } = await import("./bambooClient");
      const client = new BambooClient({ subdomain });
      const employees = await client.getDirectory();
      const match = employees.find(
        (e) =>
          (e.displayName || "").toLowerCase().includes("daria") &&
          (e.displayName || "").toLowerCase().includes("chern"),
      );
      return match?.id
        ? { employeeId: match.id, subdomain, displayName: match.displayName }
        : null;
    },
  },
  {
    label: "another directory employee (first with id)",
    resolveId: async () => {
      const prefs = await loadPreferences();
      const subdomain = resolveBambooSubdomain(prefs);
      const selfId = prefs.teamDetection?.employee?.id;
      if (!subdomain) return null;
      const { BambooClient } = await import("./bambooClient");
      const client = new BambooClient({ subdomain });
      const employees = await client.getDirectory();
      const other = employees.find((e) => e.id && e.id !== selfId);
      return other?.id
        ? { employeeId: other.id, subdomain, displayName: other.displayName }
        : null;
    },
  },
];

function formatProbeLine(
  label: string,
  probe: Awaited<ReturnType<typeof probeBambooEmployeePhoto>>,
): string {
  if (probe.outcome === "ok") {
    return `${label}: PASS http=${probe.httpStatus ?? 200} type=${probe.contentType ?? "?"} bytes=${probe.byteLength ?? 0}`;
  }
  if (probe.outcome === "forbidden") {
    return `${label}: PERMISSION BLOCKED http=403`;
  }
  if (probe.outcome === "missing") {
    return `${label}: NO PHOTO http=404`;
  }
  if (probe.failureClass === "D" || probe.httpStatus == null) {
    return `${label}: INVOKE/CLIENT ERROR — ${probe.detail ?? "unknown"}`;
  }
  return `${label}: HTTP ${probe.httpStatus} (${probe.outcome}) — ${probe.detail ?? ""}`;
}

describe.runIf(runReal)("REAL TENANT Bamboo employee photo QA", () => {
  it("probes authorized employees read-only via Tauri invoke", async (ctx) => {
    if (!(await isTauriDesktop())) {
      ctx.skip();
      return;
    }
    resetAvatarSession();
    const lines: string[] = [];
    let anyOk = false;
    let anyInvokeBroken = false;

    for (const target of PROBE_TARGETS) {
      try {
        const resolved = await target.resolveId();
        if (!resolved) {
          lines.push(`${target.label}: skipped (no id)`);
          continue;
        }
        const probe = await probeBambooEmployeePhoto(
          resolved.employeeId,
          resolved.subdomain,
          resolved.displayName,
        );
        lines.push(formatProbeLine(target.label, probe));
        if (probe.outcome === "ok") anyOk = true;
        if (probe.failureClass === "D") anyInvokeBroken = true;
      } catch (error) {
        anyInvokeBroken = true;
        lines.push(
          `${target.label}: INVOKE/CLIENT ERROR — ${error instanceof Error ? error.message : "unknown"}`,
        );
      }
    }

    // eslint-disable-next-line no-console -- intentional QA artifact for desktop/Tauri runs
    console.log("REAL TENANT PHOTO QA:\n" + lines.join("\n"));

    expect(lines.length).toBeGreaterThan(0);
    expect(anyInvokeBroken).toBe(false);
    if (!anyOk) {
      expect.soft(lines.join("\n")).toMatch(/PERMISSION BLOCKED|NO PHOTO|skipped/);
    }
  });
});

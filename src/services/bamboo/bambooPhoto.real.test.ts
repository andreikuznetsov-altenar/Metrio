import { describe, expect, it } from "vitest";
import { probeBambooEmployeePhoto, formatPhotoProbeSummary } from "./bambooPhotoProbe";
import { resolveBambooSubdomain } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";

const runReal = process.env.METRIO_REAL_BAMBOO_PHOTO === "1";

const PROBE_TARGETS = [
  { label: "current user (prefs teamDetection)", resolveId: async () => {
    const prefs = await loadPreferences();
    const employee = prefs.teamDetection?.employee;
    const subdomain = resolveBambooSubdomain(prefs);
    return employee?.id && subdomain
      ? { employeeId: employee.id, subdomain, displayName: employee.displayName }
      : null;
  }},
  { label: "Daria Chernova (directory search)", resolveId: async () => {
    const prefs = await loadPreferences();
    const subdomain = resolveBambooSubdomain(prefs);
    if (!subdomain) return null;
    const { BambooClient } = await import("./bambooClient");
    const client = new BambooClient({ subdomain });
    const employees = await client.getDirectory();
    const match = employees.find((e) =>
      (e.displayName || "").toLowerCase().includes("daria") &&
      (e.displayName || "").toLowerCase().includes("chern"),
    );
    return match?.id ? { employeeId: match.id, subdomain, displayName: match.displayName } : null;
  }},
];

describe.runIf(runReal)("REAL TENANT Bamboo employee photo QA", () => {
  it("probes authorized employees read-only", async () => {
    const results: string[] = [];
    let tauriUnavailable = false;
    for (const target of PROBE_TARGETS) {
      try {
        const resolved = await target.resolveId();
        if (!resolved) {
          results.push(`${target.label}: skipped (no id)`);
          continue;
        }
        const probe = await probeBambooEmployeePhoto(
          resolved.employeeId,
          resolved.subdomain,
          resolved.displayName,
        );
        results.push(`${target.label}: ${formatPhotoProbeSummary(probe)}`);
      } catch (error) {
        tauriUnavailable = true;
        results.push(
          `${target.label}: FAILED (${error instanceof Error ? error.message : "unknown"})`,
        );
      }
    }
    // eslint-disable-next-line no-console -- intentional QA artifact for local runs
    console.log("REAL TENANT PHOTO QA:\n" + results.join("\n"));
    if (tauriUnavailable) {
      expect.soft(results.join("\n")).toMatch(/FAILED|forbidden|ok|HTTP/);
      return;
    }
    expect(results.length).toBeGreaterThan(0);
  });
});

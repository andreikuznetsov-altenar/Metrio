/**
 * Real Bamboo Goals permission probe.
 * Run with: METRIO_REAL_BAMBOO_GOALS=1 npm test -- src/services/bamboo/bambooGoals.real.test.ts
 *
 * Reports status codes / capabilities only — no tokens, no goal titles/HR PII.
 */
import { describe, expect, it } from "vitest";
import { getVersion } from "@tauri-apps/api/app";
import { resolveBambooSubdomain } from "../../config/product";
import { loadPreferences } from "../../platform/preferences";
import { BambooClient, BambooPermissionError } from "./bambooClient";
import { ApiError } from "../../platform/apiTypes";

const runReal = process.env.METRIO_REAL_BAMBOO_GOALS === "1";

async function isTauriDesktop(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

type CapResult = {
  ok: boolean;
  status: number | null;
  capability: boolean | null;
  note?: string;
};

async function probe(
  label: string,
  fn: () => Promise<unknown>,
  mapCapability?: (value: unknown) => boolean | null,
): Promise<CapResult> {
  try {
    const value = await fn();
    return {
      ok: true,
      status: 200,
      capability: mapCapability ? mapCapability(value) : true,
    };
  } catch (e) {
    const status =
      e instanceof ApiError || e instanceof BambooPermissionError
        ? (e.status ?? null)
        : null;
    return {
      ok: false,
      status,
      capability: false,
      note: e instanceof Error ? e.name : "error",
    };
  }
}

describe.runIf(runReal)("Bamboo Goals real permission probe", () => {
  it("probes own + report capabilities without creating data", async () => {
    expect(await isTauriDesktop()).toBe(true);

    const prefs = await loadPreferences();
    const subdomain = resolveBambooSubdomain(prefs);
    expect(subdomain).toBeTruthy();

    const selfId = prefs.teamDetection?.employee?.id;
    expect(selfId).toBeTruthy();

    const client = new BambooClient({ subdomain: subdomain! });
    const reports = prefs.teamDetection?.directReports ?? [];
    const reportId = reports.find((r) => r.id && r.id !== selfId)?.id ?? null;

    const ownList = await probe("own list", () =>
      client.listGoals(selfId!, "status-inProgress"),
    );
    const ownCanCreate = await probe(
      "own canCreate",
      () => client.canCreateGoals(selfId!),
      (v) => Boolean(v),
    );
    const ownAlign = await probe("own alignment", () =>
      client.getGoalAlignmentOptions(selfId!),
    );
    const ownShare = await probe("own share", () =>
      client.getGoalShareOptions(selfId!),
    );

    let reportList: CapResult = {
      ok: false,
      status: null,
      capability: null,
      note: "no_direct_report",
    };
    let reportCanCreate: CapResult = {
      ok: false,
      status: null,
      capability: null,
      note: "no_direct_report",
    };
    if (reportId) {
      reportList = await probe("report list", () =>
        client.listGoals(reportId, "status-inProgress"),
      );
      reportCanCreate = await probe(
        "report canCreate",
        () => client.canCreateGoals(reportId),
        (v) => Boolean(v),
      );
    }

    // Capability report only — no HR content.
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          probe: "bamboo-goals-capabilities",
          own: {
            list: ownList,
            canCreate: ownCanCreate,
            alignment: ownAlign,
            sharing: ownShare,
          },
          report: {
            present: Boolean(reportId),
            list: reportList,
            canCreate: reportCanCreate,
          },
        },
        null,
        2,
      ),
    );

    expect(ownList.status === 200 || ownList.status === 403).toBe(true);
  });
});

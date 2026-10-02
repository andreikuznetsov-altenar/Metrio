import type { OrganizationOverviewModel } from "../organization/organizationTypes";
import { buildDigestId, getLocalWeekKey } from "./digestIds";
import { finalizeDigest } from "./formatDigest";
import type { OperationalDigest } from "./digestTypes";

export function buildDirectorWeeklyDigest(
  model: OrganizationOverviewModel,
  now = new Date(),
): OperationalDigest {
  const signalLines = model.signals
    .slice(0, 8)
    .map((s) => `${s.teamName}: ${s.title}`);
  const teamLines = model.teamsNeedingAttention
    .slice(0, 6)
    .map((t) => `${t.teamName} · ${t.attentionCount} attention items`);

  return finalizeDigest({
    kind: "weekly",
    role: "director",
    id: buildDigestId("weekly", "director", now),
    periodLabel: `Organization week · ${getLocalWeekKey(now)}`,
    generatedAt: now.toISOString(),
    sinceLabel: "Calendar week (Mon–Sun, local)",
    sections: [
      {
        id: "signals",
        title: "Organization signals",
        lines: signalLines.length ? signalLines : ["No organization signals this week."],
      },
      {
        id: "teams",
        title: "Teams needing attention",
        lines: teamLines.length ? teamLines : ["No teams flagged."],
      },
    ],
    summaryLine: signalLines[0] ?? "Organization overview is stable",
  });
}

import type { OperationalDigest } from "../digests/digestTypes";

export interface DigestCardContent {
  headline: string;
  detail: string;
}

export function digestCardContent(digest: OperationalDigest): DigestCardContent {
  if (digest.kind === "weekly") {
    const headline = digest.summaryLine.trim() || "Weekly summary";
    return {
      headline,
      detail:
        "Review delivery changes, workload signals and upcoming availability for this week.",
    };
  }

  const delivery = digest.sections.find((section) => section.id === "delivery");
  if (delivery?.lines.length) {
    const headline = delivery.lines[0].replace(/^•\s*/, "").trim();
    const detail =
      delivery.lines[1]?.replace(/^•\s*/, "").trim() ??
      "Delivery attention is currently concentrated in long Review work.";
    return { headline, detail };
  }

  const firstSectionLine =
    digest.sections.find((section) => section.lines.length > 0)?.lines[0] ?? "";
  const headline = digest.summaryLine.trim() || firstSectionLine || digest.periodLabel;
  const detail =
    digest.sections
      .flatMap((section) => section.lines)
      .find((line) => line.trim() && line.trim() !== headline.trim()) ??
    "Most current delivery attention is summarized for your team.";

  return {
    headline: headline.replace(/^•\s*/, "").trim(),
    detail: detail.replace(/^•\s*/, "").trim(),
  };
}

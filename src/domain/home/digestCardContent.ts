import type { OperationalDigest } from "../digests/digestTypes";

export interface DigestCardContent {
  headline: string;
  detail: string;
}

export function digestCardContent(digest: OperationalDigest): DigestCardContent {
  const firstSectionLine =
    digest.sections.find((section) => section.lines.length > 0)?.lines[0] ?? "";
  const headline = digest.summaryLine.trim() || firstSectionLine || digest.periodLabel;
  const detail =
    digest.sections
      .flatMap((section) => section.lines)
      .find((line) => line.trim() && line.trim() !== headline.trim()) ??
    (digest.kind === "weekly"
      ? "See what changed across delivery, workload, and availability."
      : "Most current delivery attention is summarized for your team.");

  return { headline, detail };
}

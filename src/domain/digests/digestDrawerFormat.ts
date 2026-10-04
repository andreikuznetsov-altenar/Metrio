import { addDays, format, parseISO } from "date-fns";
import type { DigestSection, OperationalDigest } from "./digestTypes";

export interface DigestMetricTile {
  label: string;
  value: string;
}

export interface DigestSectionCard {
  id: string;
  title: string;
  metrics?: DigestMetricTile[];
  body?: string;
  lines?: string[];
}

const ISO_WEEK_PREFIX = /^Week of (\d{4}-\d{2}-\d{2})$/;

export function formatDigestDrawerTitle(digest: OperationalDigest): string {
  if (digest.kind === "weekly") {
    const match = ISO_WEEK_PREFIX.exec(digest.periodLabel.trim());
    if (match) {
      const start = parseISO(match[1]);
      const end = addDays(start, 6);
      return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
    }
  }
  if (digest.kind === "daily") {
    return digest.periodLabel.replace(/^Team brief · /, "").replace(/^Today · /, "Today · ");
  }
  return digest.periodLabel;
}

export function formatDigestDrawerSubtitle(digest: OperationalDigest): string {
  if (digest.kind === "weekly") {
    return "Calendar week · Mon–Sun · local time";
  }
  return digest.sinceLabel;
}

function parseMetricLine(line: string): DigestMetricTile | null {
  const match = /^([^:]+):\s*(.+)$/.exec(line.trim());
  if (!match) return null;
  return { label: match[1].trim(), value: match[2].trim() };
}

function emptySectionCopy(title: string, line: string): string {
  const normalized = line.replace(/^•\s*/, "").trim();
  if (!normalized) return `No updates for ${title.toLowerCase()}.`;
  if (normalized.endsWith(".")) return normalized;
  return normalized;
}

function sectionBody(section: DigestSection): DigestSectionCard {
  const singleEmpty =
    section.lines.length === 1 &&
    /no |nothing/i.test(section.lines[0]);

  if (section.id === "week") {
    const metrics = section.lines
      .map(parseMetricLine)
      .filter((tile): tile is DigestMetricTile => tile != null);
    return {
      id: section.id,
      title: section.title,
      metrics: metrics.length ? metrics : undefined,
      body: metrics.length ? undefined : section.lines.join(" "),
    };
  }

  if (section.id === "attention" && section.lines.length > 0) {
    const metrics = section.lines.map((line, index) => {
      const match = /^(\d+)\s+(.+)$/.exec(line.trim());
      if (match) {
        return { label: match[2].trim(), value: match[1] };
      }
      const parsed = parseMetricLine(line);
      if (parsed) return parsed;
      return { label: `Item ${index + 1}`, value: line };
    });
    return { id: section.id, title: section.title, metrics };
  }

  if (singleEmpty) {
    return {
      id: section.id,
      title: section.title,
      body: emptySectionCopy(section.title, section.lines[0]),
    };
  }

  if (section.lines.length === 1) {
    return {
      id: section.id,
      title: section.title,
      body: section.lines[0].replace(/^•\s*/, ""),
    };
  }

  return {
    id: section.id,
    title: section.title,
    lines: section.lines.map((line) => line.replace(/^•\s*/, "")),
  };
}

export function digestSectionCards(digest: OperationalDigest): DigestSectionCard[] {
  return digest.sections
    .map(sectionBody)
    .filter((card) => {
      if (card.metrics?.length) return true;
      if (card.body?.trim()) return true;
      if (card.lines?.length) return true;
      return false;
    });
}

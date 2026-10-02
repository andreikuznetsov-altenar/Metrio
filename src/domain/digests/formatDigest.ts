import type { DigestSection, OperationalDigest } from "./digestTypes";

export function sectionsToPlainText(sections: DigestSection[]): string {
  return sections
    .map((section) => {
      if (!section.lines.length) return "";
      return `${section.title}\n${section.lines.map((l) => `• ${l}`).join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function finalizeDigest(
  draft: Omit<OperationalDigest, "plainText" | "summaryLine"> & {
    summaryLine?: string;
  },
): OperationalDigest {
  const plainText = sectionsToPlainText(draft.sections);
  const firstSection = draft.sections.find((s) => s.lines.length);
  const summaryLine =
    draft.summaryLine ??
    firstSection?.lines[0] ??
    "No notable changes right now.";
  return { ...draft, plainText, summaryLine };
}

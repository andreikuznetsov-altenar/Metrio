import { format, parseISO } from "date-fns";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "../../components/Button/Button";
import type { KnowledgeContextItem } from "../../domain/knowledge/knowledgeMatching";
import "./knowledge-context-row.css";

export interface KnowledgeContextRowProps {
  item: KnowledgeContextItem;
  onOpen: (url: string) => void;
}

export function KnowledgeContextRow({ item, onOpen }: KnowledgeContextRowProps) {
  const updated =
    item.page.updatedAt && !Number.isNaN(Date.parse(item.page.updatedAt))
      ? format(parseISO(item.page.updatedAt), "d MMM yyyy")
      : null;
  const relation = item.relatedIssueKey
    ? `Related to ${item.relatedIssueKey}`
    : item.confidence === "suggested"
      ? "Suggested documentation"
      : "Related documentation";

  return (
    <div className="knowledge-context-row">
      <FileText size={16} strokeWidth={1.75} aria-hidden className="knowledge-context-row__icon" />
      <div className="knowledge-context-row__body">
        <div className="knowledge-context-row__title">{item.page.title}</div>
        <div className="knowledge-context-row__meta">
          {relation}
          {updated ? ` · Updated ${updated}` : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="knowledge-context-row__open"
        aria-label={`Open ${item.page.title} in Confluence`}
        onClick={() => onOpen(item.page.url)}
      >
        <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
      </Button>
    </div>
  );
}

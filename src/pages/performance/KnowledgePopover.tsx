import { useState } from "react";
import { Button } from "../../components/Button/Button";
import type { WorkKnowledgeLink } from "../../domain/workGraph/workGraphTypes";
import { confidenceLabel } from "../../domain/workGraph/workGraphTypes";
import { openExternalUrl } from "../../platform/openExternal";
import { KnowledgeContextRow } from "./KnowledgeContextRow";
import type { KnowledgeContextItem } from "../../domain/knowledge/knowledgeMatching";

export interface KnowledgePopoverProps {
  issueKey: string;
  links: WorkKnowledgeLink[];
}

function toItem(link: WorkKnowledgeLink): KnowledgeContextItem {
  return {
    page: {
      id: link.page.id,
      title: link.page.title,
      spaceKey: link.page.spaceKey,
      spaceName: link.page.spaceName,
      url: link.page.url,
      updatedAt: link.page.updatedAt,
      excerpt: link.page.excerpt,
    },
    confidence: link.confidence === "contextual_search" ? "suggested" : "related",
    relatedIssueKey: link.issueKey,
  };
}

export function KnowledgePopover({ issueKey, links }: KnowledgePopoverProps) {
  const [open, setOpen] = useState(false);
  if (!links.length) return null;

  return (
    <div className="knowledge-popover">
      <Button type="button" variant="ghost" onClick={() => setOpen((v) => !v)}>
        {links.length} docs
      </Button>
      {open ? (
        <div className="knowledge-popover__panel" role="dialog" aria-label={`Related knowledge for ${issueKey}`}>
          <h4 className="performance-section__title">Related knowledge</h4>
          {links.map((link) => (
            <div key={link.id}>
              <KnowledgeContextRow
                item={toItem(link)}
                onOpen={(url) => void openExternalUrl(url)}
              />
              <span className="performance-inline-empty">
                {link.label ?? confidenceLabel(link.confidence)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

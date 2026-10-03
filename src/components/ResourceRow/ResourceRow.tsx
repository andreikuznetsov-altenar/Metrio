import { ExternalLink, FileText, LayoutGrid } from "lucide-react";
import type { OnboardingResourceSource } from "../../domain/onboarding/resourceTypes";
import { Tooltip } from "../Tooltip/Tooltip";
import "./ResourceRow.css";

export interface ResourceRowProps {
  title: string;
  subtitle?: string;
  source?: OnboardingResourceSource | "company" | "external";
  onOpen: () => void;
  disabled?: boolean;
  externalLabel?: string;
}

function sourceLabel(source: ResourceRowProps["source"]): string {
  switch (source) {
    case "confluence":
      return "Confluence";
    case "jira":
      return "Jira";
    case "bamboo":
      return "BambooHR";
    case "curated":
    case "company":
      return "Company";
    case "external":
      return "External";
    default:
      return "Resource";
  }
}

export function ResourceRow({
  title,
  subtitle,
  source,
  onOpen,
  disabled = false,
  externalLabel = "Open in browser",
}: ResourceRowProps) {
  const Icon =
    source === "bamboo" ? LayoutGrid : FileText;

  return (
    <div className="resource-row">
      <span className="resource-row__icon" aria-hidden>
        <Icon size={18} strokeWidth={1.6} />
      </span>
      <div className="resource-row__body">
        <span className="resource-row__title">{title}</span>
        <span className="resource-row__meta">
          {sourceLabel(source)}
          {subtitle ? ` · ${subtitle}` : ""}
        </span>
      </div>
      <Tooltip content={externalLabel}>
        <button
          type="button"
          className="resource-row__action"
          aria-label={`${externalLabel}: ${title}`}
          disabled={disabled}
          onClick={onOpen}
        >
          <ExternalLink size={16} strokeWidth={1.75} />
        </button>
      </Tooltip>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { readSavedConnection } from "../app/connectionStorage";
import {
  summarizeConnectionHealth,
  type ConnectionHealthSummary,
} from "../platform/connectionHealth";
import { loadPreferences } from "../platform/preferences";
import "./ConnectionHealthBadge.css";

function statusFromSync(
  hasToken: boolean,
  stale: boolean,
): "connected" | "error" | "loading" {
  if (!hasToken) return "loading";
  return stale ? "error" : "connected";
}

export interface ConnectionHealthBadgeProps {
  onOpenConnections?: () => void;
}

export function ConnectionHealthBadge({
  onOpenConnections,
}: ConnectionHealthBadgeProps) {
  const [summary, setSummary] = useState<ConnectionHealthSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [prefs, saved] = await Promise.all([
          loadPreferences(),
          readSavedConnection(),
        ]);
        if (cancelled) return;
        const next = summarizeConnectionHealth({
          prefs,
          hasJiraToken: saved?.hasJiraToken ?? false,
          hasBambooToken: saved?.hasBambooApiKey ?? false,
          jiraStatus: statusFromSync(
            saved?.hasJiraToken ?? false,
            prefs.sync.jiraStale,
          ),
          bambooStatus: statusFromSync(
            saved?.hasBambooApiKey ?? false,
            prefs.sync.bambooStale,
          ),
        });
        setSummary(next);
      } catch {
        if (!cancelled) {
          setSummary(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const className = useMemo(() => {
    if (!summary) return "connection-health-badge";
    if (summary.level === "ok") return "connection-health-badge connection-health-badge--ok";
    if (summary.level === "offline") {
      return "connection-health-badge connection-health-badge--offline";
    }
    return "connection-health-badge connection-health-badge--attention";
  }, [summary]);

  if (!summary) {
    return null;
  }

  return (
    <button
      type="button"
      className={className}
      title={summary.detail}
      onClick={onOpenConnections}
    >
      {summary.headerLabel}
    </button>
  );
}

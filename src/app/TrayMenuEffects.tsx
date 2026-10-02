import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { dispatchAppRoute, dispatchEmployeeView } from "./actionNavigation";
import { logoutSession } from "./logoutSession";
import { openExternalUrl } from "../platform/openExternal";
import { acknowledgeTrayJiraIssue, clearTrayUserContext } from "../platform/trayActionCenter";
import { resolveBambooSubdomain } from "../config/product";

function bambooHomeUrl(): string {
  const subdomain = resolveBambooSubdomain();
  return subdomain
    ? `https://${subdomain}.bamboohr.com/`
    : "https://www.bamboohr.com/";
}

/** Tray menu actions emitted from native Rust. */
export function TrayMenuEffects({
  onRefresh,
}: {
  onRefresh: () => void;
}) {
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    void listen("tray-refresh", () => onRefresh())
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);

    void listen("tray-logout", () => {
      void clearTrayUserContext().finally(() => logoutSession());
    })
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);

    void listen<{ issueKey: string }>("tray-open-jira", (event) => {
      const issueKey = event.payload?.issueKey;
      if (!issueKey) return;
      void acknowledgeTrayJiraIssue(issueKey);
      void openExternalUrl(jiraIssueUrl(issueKey));
    })
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);

    void listen("tray-view-all-work", () => {
      dispatchAppRoute("performance");
      dispatchEmployeeView("my-week");
    })
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);

    void listen("tray-bamboo-action", () => {
      void openExternalUrl(bambooHomeUrl());
    })
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);

    void listen("tray-vacation", () => {
      void openExternalUrl(bambooHomeUrl());
    })
      .then((fn) => unsubs.push(fn))
      .catch(() => undefined);

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [onRefresh]);

  return null;
}

function jiraIssueUrl(issueKey: string): string {
  const base = import.meta.env.VITE_JIRA_BASE_URL || "";
  if (base) {
    return `${String(base).replace(/\/$/, "")}/browse/${issueKey}`;
  }
  return `https://jira.atlassian.com/browse/${issueKey}`;
}

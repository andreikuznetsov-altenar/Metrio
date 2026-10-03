import type { CommandResult } from "./commandResultTypes";

export interface PaletteCommandDef {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  commandId: string;
}

export const PALETTE_COMMANDS: PaletteCommandDef[] = [
  {
    id: "cmd-home",
    title: "Go to Home",
    subtitle: "Metrio navigation",
    keywords: ["home", "start"],
    commandId: "navigate-home",
  },
  {
    id: "cmd-performance",
    title: "Go to Performance",
    subtitle: "Metrio navigation",
    keywords: ["performance", "team", "analytics"],
    commandId: "navigate-performance",
  },
  {
    id: "cmd-feedback",
    title: "Go to Feedback",
    subtitle: "Surveys and delivery",
    keywords: ["feedback", "survey"],
    commandId: "navigate-feedback",
  },
  {
    id: "cmd-refresh",
    title: "Refresh",
    subtitle: "Reload performance data",
    keywords: ["refresh", "sync"],
    commandId: "refresh-data",
  },
  {
    id: "cmd-my-work",
    title: "Open my work",
    subtitle: "Employee performance overview",
    keywords: ["my work", "tasks", "week"],
    commandId: "open-my-work",
  },
  {
    id: "cmd-notifications",
    title: "Open Notification Center",
    subtitle: "Inbox and alerts",
    keywords: ["notifications", "inbox", "alerts"],
    commandId: "open-notifications",
  },
  {
    id: "cmd-settings",
    title: "Open Settings",
    subtitle: "Connections and preferences",
    keywords: ["settings", "preferences", "connections"],
    commandId: "open-settings",
  },
  {
    id: "cmd-theme",
    title: "Switch theme",
    subtitle: "Light, dark, or system",
    keywords: ["theme", "dark", "light"],
    commandId: "switch-theme",
  },
  {
    id: "cmd-prepare-1-1",
    title: "Prepare for next 1:1",
    subtitle: "Open Person Brief for your upcoming 1:1",
    keywords: ["1:1", "prepare", "calendar", "meeting"],
    commandId: "prepare-next-one-on-one",
  },
  {
    id: "cmd-today-meetings",
    title: "Open today's meetings",
    subtitle: "Go to Home upcoming calendar",
    keywords: ["meetings", "calendar", "today"],
    commandId: "open-today-meetings",
  },
];

export function searchPaletteCommands(query: string): CommandResult[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return PALETTE_COMMANDS.slice(0, 4).map((command, index) =>
      commandToResult(command, 200 - index),
    );
  }
  return PALETTE_COMMANDS
    .map((command) => {
      const haystack = [
        command.title,
        command.subtitle,
        ...command.keywords,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q) && !command.title.toLowerCase().startsWith(q)) {
        return null;
      }
      const score =
        command.title.toLowerCase() === q
          ? 880
          : command.title.toLowerCase().startsWith(q)
            ? 820
            : 700;
      return commandToResult(command, score);
    })
    .filter((item): item is CommandResult => item != null);
}

function commandToResult(command: PaletteCommandDef, score: number): CommandResult {
  return {
    id: command.id,
    type: "command",
    title: command.title,
    subtitle: command.subtitle,
    section: "commands",
    score,
    target: { kind: "command", commandId: command.commandId },
  };
}

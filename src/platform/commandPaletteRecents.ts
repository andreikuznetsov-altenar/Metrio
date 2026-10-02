import type {
  CommandPaletteTarget,
  CommandResultType,
} from "../domain/commandPalette/commandResultTypes";

const STORAGE_KEY = "metrio-command-palette-recents";
const MAX_RECENTS = 16;

export interface CommandPaletteRecent {
  type: CommandResultType;
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  target: CommandPaletteTarget;
  visitedAt: string;
}

export function listCommandPaletteRecents(): CommandPaletteRecent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommandPaletteRecent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordCommandPaletteRecent(input: {
  type: CommandResultType;
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  target: CommandPaletteTarget;
}): void {
  if (typeof localStorage === "undefined") return;
  const now = new Date().toISOString();
  const entry: CommandPaletteRecent = { ...input, visitedAt: now };
  const dedupeKey = `${input.type}:${input.id}`;
  const next = [
    entry,
    ...listCommandPaletteRecents().filter(
      (item) => `${item.type}:${item.id}` !== dedupeKey,
    ),
  ].slice(0, MAX_RECENTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearCommandPaletteRecentsForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

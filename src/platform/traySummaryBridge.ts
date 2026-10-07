import { invoke } from "@tauri-apps/api/core";
import type { TraySummaryModel } from "../domain/tray/buildTraySummaryModel";

export interface TraySummaryDto {
  role: TraySummaryModel["role"];
  open_task_count: number;
  problem_task_count: number;
  index_label: string;
  index_value: string;
  index_available: boolean;
  unread_notification_count: number;
}

export function traySummaryToDto(summary: TraySummaryModel): TraySummaryDto {
  return {
    role: summary.role,
    open_task_count: summary.openTaskCount,
    problem_task_count: summary.problemTaskCount,
    index_label: summary.indexLabel,
    index_value: summary.indexValue,
    index_available: summary.indexAvailable,
    unread_notification_count: summary.unreadNotificationCount,
  };
}

export function traySummaryFromDto(dto: TraySummaryDto): TraySummaryModel {
  const unread = dto.unread_notification_count;
  return {
    role: dto.role,
    openTaskCount: dto.open_task_count,
    problemTaskCount: dto.problem_task_count,
    indexLabel: dto.index_label,
    indexValue: dto.index_value,
    indexAvailable: dto.index_available,
    unreadNotificationCount: unread,
    trayTitle: unread > 0 ? String(unread) : undefined,
  };
}

export async function pushTraySummaryToNative(
  summary: TraySummaryModel,
  menuItems: { id: string; label: string; enabled?: boolean; kind?: "item" | "separator" }[],
): Promise<void> {
  await invoke("update_tray_snapshot", {
    snapshot: {
      tray_title: summary.trayTitle ?? null,
      menu_items: menuItems,
      summary: traySummaryToDto(summary),
    },
  });
  await invoke("refresh_tray_menu");
}

export async function fetchTraySummaryFromNative(): Promise<TraySummaryModel | null> {
  try {
    const dto = await invoke<TraySummaryDto | null>("get_tray_summary");
    return dto ? traySummaryFromDto(dto) : null;
  } catch {
    return null;
  }
}

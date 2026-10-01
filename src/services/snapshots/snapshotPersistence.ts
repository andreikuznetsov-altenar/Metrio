import { invoke } from '@tauri-apps/api/core';
import {
  EMPTY_KPI_SNAPSHOT_FILE,
  migrateKpiSnapshotFile,
} from '../../domain/snapshots/snapshotEngine';
import type { KpiSnapshotFile } from '../../domain/snapshots/types';

export async function loadKpiSnapshots(): Promise<KpiSnapshotFile> {
  const raw = await invoke<Partial<KpiSnapshotFile>>('kpi_snapshot_load');
  return migrateKpiSnapshotFile(raw);
}

export async function saveKpiSnapshots(file: KpiSnapshotFile): Promise<void> {
  await invoke('kpi_snapshot_save', { data: file });
}

export { EMPTY_KPI_SNAPSHOT_FILE };

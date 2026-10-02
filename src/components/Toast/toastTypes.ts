export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastInput {
  id?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastRecord extends ToastInput {
  id: string;
  variant: ToastVariant;
  durationMs: number;
}

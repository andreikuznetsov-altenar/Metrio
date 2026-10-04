import { invoke } from "@tauri-apps/api/core";
import { parseInvokeError } from "../../platform/apiTypes";
import {
  noteEmployeePhotoPermissionDenied,
  type BambooPhotoPayload,
} from "./bambooAvatarService";

export type BambooPhotoFailureClass =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J";

export type BambooPhotoProbeOutcome =
  | "ok"
  | "missing"
  | "forbidden"
  | "failed"
  | "skipped";

export interface BambooPhotoProbeResult {
  employeeId: string;
  displayName?: string;
  outcome: BambooPhotoProbeOutcome;
  httpStatus?: number;
  contentType?: string;
  byteLength?: number;
  failureClass?: BambooPhotoFailureClass;
  detail?: string;
}

export function classifyPhotoProbeFailure(
  outcome: BambooPhotoProbeOutcome,
  httpStatus?: number,
  hadEmployeeId = true,
): BambooPhotoFailureClass {
  if (!hadEmployeeId || outcome === "skipped") return "A";
  if (outcome === "forbidden" || httpStatus === 403) return "E";
  if (outcome === "missing" || httpStatus === 404) return "F";
  if (outcome === "failed") return httpStatus ? "G" : "D";
  return "J";
}

function byteLengthFromBase64(dataBase64: string): number {
  try {
    if (typeof atob === "function") {
      return atob(dataBase64).length;
    }
  } catch {
    return 0;
  }
  const padding = dataBase64.endsWith("==") ? 2 : dataBase64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((dataBase64.length * 3) / 4) - padding);
}

/** Read-only Bamboo photo probe — never logs tokens or image bytes. */
export async function probeBambooEmployeePhoto(
  employeeId: string,
  subdomain: string,
  displayName?: string,
): Promise<BambooPhotoProbeResult> {
  const trimmedId = employeeId.trim();
  const trimmedSubdomain = subdomain.trim();
  if (!trimmedId) {
    return {
      employeeId: "",
      displayName,
      outcome: "skipped",
      failureClass: "A",
      detail: "Employee ID missing",
    };
  }
  if (!trimmedSubdomain) {
    return {
      employeeId: trimmedId,
      displayName,
      outcome: "skipped",
      failureClass: "C",
      detail: "Bamboo subdomain missing",
    };
  }

  try {
    const payload = await invoke<BambooPhotoPayload>("bamboo_get_employee_photo", {
      config: { subdomain: trimmedSubdomain },
      employee_id: trimmedId,
      photo_size: "small",
    });
    const byteLength = byteLengthFromBase64(payload.data_base64);
    if (!byteLength || !payload.content_type?.startsWith("image/")) {
      return {
        employeeId: trimmedId,
        displayName,
        outcome: "failed",
        contentType: payload.content_type,
        byteLength,
        failureClass: "H",
        detail: "Invalid image payload",
      };
    }
    return {
      employeeId: trimmedId,
      displayName,
      outcome: "ok",
      httpStatus: 200,
      contentType: payload.content_type,
      byteLength,
    };
  } catch (error) {
    const api = parseInvokeError(error);
    const status = api.status;
    let outcome: BambooPhotoProbeOutcome = "failed";
    if (status === 404) outcome = "missing";
    else if (status === 403) {
      outcome = "forbidden";
      noteEmployeePhotoPermissionDenied();
    }
    return {
      employeeId: trimmedId,
      displayName,
      outcome,
      httpStatus: status,
      failureClass: classifyPhotoProbeFailure(outcome, status, true),
      detail: api.message,
    };
  }
}

export function formatPhotoProbeSummary(result: BambooPhotoProbeResult): string {
  const who = result.displayName
    ? `${result.displayName} (${result.employeeId})`
    : result.employeeId;
  if (result.outcome === "ok") {
    return `${who}: photo loaded (${result.byteLength ?? 0} bytes, ${result.contentType ?? "image"})`;
  }
  if (result.httpStatus) {
    return `${who}: HTTP ${result.httpStatus} (${result.outcome})`;
  }
  return `${who}: ${result.outcome}${result.detail ? ` — ${result.detail}` : ""}`;
}

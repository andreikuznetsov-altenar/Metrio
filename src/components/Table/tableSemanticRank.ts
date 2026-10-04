/** Explicit semantic ordering for table `status` columns — not alphabetical. */

export type StatusSortKind =
  | "attentionSeverity"
  | "workload"
  | "availability"
  | "feedbackRecipient"
  | "deliveryStatus"
  | "generic";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** critical > warning > info/neutral (domain radar severity labels). */
export function rankAttentionSeverity(value: unknown): number {
  const v = normalize(String(value ?? ""));
  if (v === "critical" || v.includes("critical")) return 0;
  if (v === "warning" || v.includes("warning")) return 1;
  if (v === "info" || v.includes("info")) return 2;
  return 3;
}

/** overloaded > heavy > normal/light/unknown */
export function rankWorkloadLabel(value: unknown): number {
  const v = normalize(String(value ?? ""));
  if (v.includes("overload")) return 0;
  if (v === "heavy" || v.includes("high")) return 1;
  if (v === "normal" || v === "balanced" || v.includes("balance")) return 2;
  if (v === "light") return 3;
  return 4;
}

export function rankAvailabilityLabel(value: unknown): number {
  const v = normalize(String(value ?? ""));
  if (v.includes("vacation") || v.includes("away") || v.includes("off")) return 0;
  if (v.includes("return")) return 1;
  if (v.startsWith("available")) return 3;
  return 2;
}

/** Higher attention first: failed > pending > sent > draft > responded */
export function rankFeedbackRecipientStatus(value: unknown): number {
  const v = normalize(String(value ?? ""));
  if (v.includes("fail")) return 0;
  if (v.includes("pending") || v.includes("attention")) return 1;
  if (v.includes("sent") || v.includes("sending")) return 2;
  if (v.includes("draft") || v.includes("prepared")) return 3;
  if (v.includes("respond")) return 4;
  return 5;
}

export function rankDeliveryIssueStatus(value: unknown): number {
  const v = normalize(String(value ?? ""));
  if (v.includes("block")) return 0;
  if (v.includes("review")) return 1;
  if (v.includes("progress")) return 2;
  if (v.includes("done") || v.includes("closed")) return 4;
  return 3;
}

export function compareSemanticStatus(
  a: unknown,
  b: unknown,
  kind: StatusSortKind,
): number {
  const rank =
    kind === "attentionSeverity"
      ? rankAttentionSeverity
      : kind === "workload"
        ? rankWorkloadLabel
        : kind === "availability"
          ? rankAvailabilityLabel
          : kind === "feedbackRecipient"
            ? rankFeedbackRecipientStatus
            : kind === "deliveryStatus"
              ? rankDeliveryIssueStatus
              : (x: unknown) => normalize(String(x ?? "")).localeCompare("");

  if (kind === "generic") {
    return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
      sensitivity: "base",
    });
  }
  return rank(a) - rank(b);
}

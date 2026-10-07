/** When a single issue key is shown inline, avoid duplicating it in the subject title. */
export function shouldAppendAttentionSubjectTitle(
  title: string | undefined,
  issueKeys: string[],
): boolean {
  const normalized = title?.trim() ?? "";
  if (!normalized) return false;
  if (issueKeys.length !== 1) return true;
  const key = issueKeys[0];
  if (normalized === key) return false;
  const withoutKey = normalized.replace(key, "").replace(/^[—–\-·:\s]+/, "").trim();
  if (!withoutKey) return false;
  return true;
}

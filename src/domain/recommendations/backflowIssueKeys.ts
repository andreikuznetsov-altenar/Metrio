/** Issue keys whose delivery-risk reason is a backflow signal. */
export function backflowIssueKeysFromRiskRows(
  rows: Array<{ issueKey: string; riskReason: string }>,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!/backflow/i.test(row.riskReason)) continue;
    if (!row.issueKey || seen.has(row.issueKey)) continue;
    seen.add(row.issueKey);
    keys.push(row.issueKey);
  }
  return keys;
}

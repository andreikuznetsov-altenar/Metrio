import { describe, expect, it } from "vitest";
import { pushDigestHistory, trimDigestHistory } from "./digestHistory";
import type { OperationalDigest } from "./digestTypes";

function digest(id: string, kind: "daily" | "weekly"): OperationalDigest {
  return {
    kind,
    role: "employee",
    id,
    periodLabel: id,
    generatedAt: "2026-01-01T00:00:00.000Z",
    sinceLabel: "Since your previous daily brief",
    sections: [],
    summaryLine: "ok",
    plainText: id,
  };
}

describe("digestHistory", () => {
  it("keeps last 7 daily and 8 weekly", () => {
    let history = { daily: [] as OperationalDigest[], weekly: [] as OperationalDigest[] };
    for (let i = 0; i < 10; i++) {
      history = pushDigestHistory(history, digest(`d${i}`, "daily"));
    }
    expect(history.daily).toHaveLength(7);
    expect(history.daily[0].id).toBe("d3");

    for (let i = 0; i < 10; i++) {
      history = pushDigestHistory(history, digest(`w${i}`, "weekly"));
    }
    expect(history.weekly).toHaveLength(8);
    expect(history.weekly[0].id).toBe("w2");
  });

  it("replaces digest with same id", () => {
    const first = digest("daily:2026-03-01:employee", "daily");
    const updated = { ...first, summaryLine: "updated" };
    const history = pushDigestHistory({ daily: [], weekly: [] }, first);
    const next = pushDigestHistory(history, updated);
    expect(next.daily).toHaveLength(1);
    expect(next.daily[0].summaryLine).toBe("updated");
  });

  it("trimDigestHistory caps arrays", () => {
    const daily = Array.from({ length: 12 }, (_, i) => digest(`d${i}`, "daily"));
    const trimmed = trimDigestHistory({ daily, weekly: [] });
    expect(trimmed.daily).toHaveLength(7);
  });
});

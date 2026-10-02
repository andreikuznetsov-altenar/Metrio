import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCommandPaletteRecentsForTests,
  listCommandPaletteRecents,
  recordCommandPaletteRecent,
} from "./commandPaletteRecents";

describe("commandPaletteRecents", () => {
  beforeEach(() => {
    clearCommandPaletteRecentsForTests();
  });

  it("stores safe metadata only", () => {
    recordCommandPaletteRecent({
      type: "person",
      id: "p1",
      title: "Alex Morgan",
      subtitle: "Open person",
      target: { kind: "person", personId: "p1" },
    });
    const [recent] = listCommandPaletteRecents();
    expect(recent.title).toBe("Alex Morgan");
    expect(recent.target).toEqual({ kind: "person", personId: "p1" });
  });
});

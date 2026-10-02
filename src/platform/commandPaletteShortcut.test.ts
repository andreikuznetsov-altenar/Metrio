import { describe, expect, it } from "vitest";
import { isCommandPaletteShortcut } from "./commandPaletteShortcut";

describe("commandPaletteShortcut", () => {
  it("detects Cmd+K and Ctrl+K", () => {
    expect(
      isCommandPaletteShortcut({
        metaKey: true,
        ctrlKey: false,
        key: "k",
      } as KeyboardEvent),
    ).toBe(true);
    expect(
      isCommandPaletteShortcut({
        metaKey: false,
        ctrlKey: true,
        key: "K",
      } as KeyboardEvent),
    ).toBe(true);
  });
});

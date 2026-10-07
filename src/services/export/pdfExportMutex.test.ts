import { describe, expect, it } from "vitest";
import { isPdfExportInProgress, withPdfExportMutex } from "./pdfExportMutex";

describe("pdfExportMutex", () => {
  it("blocks concurrent exports", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = withPdfExportMutex(async () => {
      await gate;
      return "first";
    });
    expect(isPdfExportInProgress()).toBe(true);

    const second = await withPdfExportMutex(async () => "second");
    expect(second).toEqual({ status: "busy" });

    release?.();
    const firstResult = await first;
    expect(firstResult).toEqual({ status: "ok", value: "first" });
    expect(isPdfExportInProgress()).toBe(false);
  });
});

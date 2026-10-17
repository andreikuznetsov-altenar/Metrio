import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("PDF report metadata labels", () => {
  it("names the review target in weekdays, matching the stage-age semantics", () => {
    const source = readFileSync(join(process.cwd(), "src/services/export/PdfReportDocument.tsx"), "utf8");
    expect(source).toContain("label: 'Target review weekdays'");
    expect(source).not.toContain("Target review days");
  });
});

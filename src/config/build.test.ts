import { describe, expect, it } from "vitest";
import {
  formatBuildChannelLine,
  formatBuildLabel,
  isNonReleaseBuild,
  isUpdaterAvailableForBuild,
  type BuildInfo,
} from "./build";

const reviewProduction: BuildInfo = {
  version: "0.1.0",
  commit: "dev",
  channel: "production",
  productName: "Metrio",
};

const releaseProduction: BuildInfo = {
  version: "0.1.0",
  commit: "cc8bae73d070490b790606decaf65b30b4e36130",
  channel: "production",
  productName: "Metrio",
};

describe("build metadata presentation", () => {
  it("never shows contradictory Production · dev", () => {
    expect(formatBuildChannelLine(reviewProduction)).toBe("Review build");
    expect(formatBuildLabel(reviewProduction)).not.toContain("Production · dev");
    expect(formatBuildLabel(reviewProduction)).toContain("0.1.0");
  });

  it("shows production with short commit for release builds", () => {
    expect(formatBuildChannelLine(releaseProduction)).toBe("Production · cc8bae7");
  });

  it("disables updater for review production builds", () => {
    expect(isNonReleaseBuild(reviewProduction)).toBe(true);
    expect(isUpdaterAvailableForBuild(reviewProduction)).toBe(false);
    expect(isUpdaterAvailableForBuild(releaseProduction)).toBe(true);
  });
});

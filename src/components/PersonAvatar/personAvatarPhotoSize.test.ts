import { describe, expect, it } from "vitest";
import { bambooPhotoSizeForAvatar } from "./personAvatarPhotoSize";

describe("bambooPhotoSizeForAvatar", () => {
  it("maps compact sizes to small Bamboo photo", () => {
    expect(bambooPhotoSizeForAvatar("xs")).toBe("small");
    expect(bambooPhotoSizeForAvatar("sm")).toBe("small");
  });

  it("maps larger UI sizes to medium Bamboo photo", () => {
    expect(bambooPhotoSizeForAvatar("md")).toBe("medium");
    expect(bambooPhotoSizeForAvatar("lg")).toBe("medium");
    expect(bambooPhotoSizeForAvatar("xl")).toBe("medium");
  });
});

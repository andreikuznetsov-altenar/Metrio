import type { BambooEmployeePhotoSize } from "../../services/bamboo/bambooAvatarService";
import type { PersonAvatarSize } from "./PersonAvatar";

export function bambooPhotoSizeForAvatar(size: PersonAvatarSize): BambooEmployeePhotoSize {
  switch (size) {
    case "xs":
    case "sm":
      return "small";
    case "md":
    case "lg":
    case "xl":
      return "medium";
    default:
      return "small";
  }
}

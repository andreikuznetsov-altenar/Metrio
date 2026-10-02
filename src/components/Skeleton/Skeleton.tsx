import type { CSSProperties } from "react";
import "./Skeleton.css";

export type SkeletonVariant = "text" | "circle" | "rect";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}

export function Skeleton({
  variant = "rect",
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  const classNames = ["skeleton", `skeleton--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classNames}
      style={{
        width,
        height,
        ...style,
      }}
      {...rest}
    />
  );
}

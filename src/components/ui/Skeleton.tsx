import React from "react";
import { cn } from "@/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: "pulse" | "wave" | "none";
  width?: number | string;
  height?: number | string;
  count?: number;
}

/**
 * Renders one or more placeholder blocks used while content is loading.
 * @param props - Component props.
 * @param props.animation - Animation style: `pulse`, `wave`, or `none`. Defaults to `pulse`.
 * @param props.width - Optional explicit width applied via inline style.
 * @param props.height - Optional explicit height applied via inline style.
 * @param props.count - Number of placeholder blocks to render. Defaults to `1`.
 * @param props.className - Additional class names applied to each placeholder.
 * @returns A fragment containing the placeholder elements.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  animation = "pulse",
  width,
  height,
  count = 1,
  className,
  ...props
}) => {
  const items = Array.from({ length: count }, (_, i) => `skeleton-${i}`);

  /** Returns the Tailwind animation class for the selected `animation` variant. */
  const getAnimationClass = () => {
    switch (animation) {
      case "pulse":
        return "animate-pulse";
      case "wave":
        return "animate-shimmer";
      default:
        return "";
    }
  };

  const style = {
    width,
    height,
  };

  return (
    <>
      {items.map((skeletonId) => (
        <div
          key={skeletonId}
          className={cn("bg-gray-200 rounded", getAnimationClass(), className)}
          style={style}
          {...props}
        />
      ))}
    </>
  );
};

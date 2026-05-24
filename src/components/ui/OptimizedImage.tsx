import React, { useState, useRef, useEffect } from "react";
import { ImageOptimizer } from "@/utils/performance/imageOptimizer";
import { cn } from "@/utils/cn";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

/** Lazily-loaded image component with progressive loading and error fallback. */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = "lazy",
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const imageOptimizer = ImageOptimizer.getInstance();

  useEffect(() => {
    if (priority && imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [priority]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return undefined;

    /** Marks the image as loaded when it finishes loading. */
    const handleLoad = () => setIsLoaded(true);
    /** Marks the image as errored and loaded when the load fails. */
    const handleError = () => {
      setError(true);
      setIsLoaded(true);
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);

    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, []);

  if (error) {
    return (
      <div
        className={cn(
          "bg-gray-100 flex items-center justify-center",
          className,
        )}
        style={{ width, height }}
      >
        <span className="text-gray-400">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <picture>
        {/* AVIF format */}
        <source
          type="image/avif"
          srcSet={imageOptimizer.generateSrcSet(src, "avif")}
          sizes={imageOptimizer.generateSizes(width)}
        />
        {/* WebP format */}
        <source
          type="image/webp"
          srcSet={imageOptimizer.generateSrcSet(src, "webp")}
          sizes={imageOptimizer.generateSizes(width)}
        />
        {/* Fallback image */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      </picture>

      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            backgroundImage: `url(${imageOptimizer.generatePlaceholder(src)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
    </div>
  );
};

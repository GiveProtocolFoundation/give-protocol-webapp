import React, { useState, useRef, useEffect } from "react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string;
}

/**
 * Image element that swaps to a fallback source if the primary image fails to load.
 * @param props - Component props.
 * @param props.src - Primary image source URL.
 * @param props.fallbackSrc - Image URL used when the primary source errors.
 * @param props.alt - Alt text forwarded to the underlying `<img>`.
 * @returns An `<img>` element with error-driven source fallback.
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc,
  alt,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return undefined;

    const handleError = () => setImgSrc(fallbackSrc);
    img.addEventListener("error", handleError);

    return () => {
      img.removeEventListener("error", handleError);
    };
  }, [fallbackSrc]);

  return <img {...props} ref={imgRef} src={imgSrc} alt={alt} />;
};

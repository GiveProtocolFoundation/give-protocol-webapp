import React, { useState, useRef, useEffect } from "react";

interface LogoProps {
  className?: string;
}

/**
 * Renders the Give Protocol brand logo, falling back to a "GP" text mark when the SVG fails to load.
 * @param props - Component props.
 * @param props.className - Optional class names applied to the rendered element.
 * @returns The logo image, or a text fallback if the asset cannot be loaded.
 */
export const Logo: React.FC<LogoProps> = ({ className }) => {
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return undefined;

    const handleError = () => setError(true);
    img.addEventListener("error", handleError);

    return () => {
      img.removeEventListener("error", handleError);
    };
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-2xl font-bold">GP</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src="/give_logo_gradient.svg"
      alt="Give Protocol"
      className={className}
      width={32}
      height={32}
    />
  );
};

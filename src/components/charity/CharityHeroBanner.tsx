import React, { useState, useCallback } from "react";

interface CharityHeroBannerProps {
  bannerImageUrl: string | null | undefined;
  orgName: string;
}

/**
 * Full-width hero banner for the charity profile page.
 * Shows the uploaded banner image or a placeholder with the org's initials.
 * @param props - Component props
 * @param props.bannerImageUrl - URL of the banner image, if uploaded
 * @param props.orgName - Organization name (used for initials placeholder)
 * @returns The rendered banner element
 */
export const CharityHeroBanner: React.FC<CharityHeroBannerProps> = ({
  bannerImageUrl,
  orgName,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const initials = orgName
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();

  if (bannerImageUrl && !imageError) {
    return (
      <div className="relative h-40 md:h-56 w-full rounded-t-xl overflow-hidden">
        <img
          src={bannerImageUrl}
          alt={`${orgName} banner`}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
    );
  }

  return (
    <div
      className="relative h-40 md:h-56 w-full rounded-t-xl overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800"
      role="img"
      aria-label={`${orgName} banner placeholder`}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl md:text-6xl font-serif font-bold text-white/20 select-none">
          {initials}
        </span>
        <span className="mt-2 text-xs text-white/40 font-medium">
          No banner photo yet
        </span>
      </div>
    </div>
  );
};

import React from "react";

interface CharityHeroSectionProps {
  image: string;
  title: string;
  description: string;
  country?: string;
  verified?: boolean;
}

/**
 * Charity-specific hero banner with an optional country label and verification badge.
 * @param props - Component props.
 * @param props.image - Source URL for the background image.
 * @param props.title - Charity name displayed prominently.
 * @param props.description - Charity tagline or short description.
 * @param props.country - Optional country label shown above the title.
 * @param props.verified - When `true`, renders a "Verified" badge.
 * @returns The charity hero section element.
 */
export const CharityHeroSection: React.FC<CharityHeroSectionProps> = ({
  image,
  title,
  description,
  country,
  verified,
}) => {
  return (
    <div className="relative h-80 rounded-xl overflow-hidden mb-6 mx-4 sm:mx-6 lg:mx-8 mt-8">
      <img src={image} alt={title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-8 text-white">
        {verified && (
          <span className="px-3 py-1 bg-green-500 text-gray-900 text-sm font-medium rounded-full self-start mb-2">
            Verified
          </span>
        )}
        {country && <span className="text-sm opacity-90 mb-2">{country}</span>}
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-lg opacity-90">{description}</p>
      </div>
    </div>
  );
};

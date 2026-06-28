// Mock for @/components/charity/CharityHeroBanner
// Renders with proper ARIA roles/labels mirroring the real component's ARIA behavior.
export const CharityHeroBanner = ({ orgName, bannerImageUrl }) => (
  <div
    data-testid="charity-hero-banner"
    role="img"
    aria-label={
      bannerImageUrl ? `${orgName} banner` : `${orgName} banner placeholder`
    }
  >
    {orgName}
  </div>
);

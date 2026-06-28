import React, { useState, useCallback, useMemo } from "react";
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  ChevronUp,
  Building2,
  Rss,
  Network,
  Users,
  Link,
} from "lucide-react";
import type { OrganizationProfile } from "@/types/charity";

interface OrganizationInfoSectionProps {
  profile: OrganizationProfile | null;
  charityName: string;
}

const SOCIAL_ICON_CLASS = "h-5 w-5 flex-shrink-0";

/**
 * OrganizationInfoSection component displays detailed information about an organization, such as year founded, address, contact info, and social media links, with expandable section.
 * @param profile - The organization profile containing data like yearFounded, address, contact, and social links.
 * @param charityName - The display name of the charity.
 * @returns A React element rendering the organization's information section.
 */
export const OrganizationInfoSection: React.FC<
  OrganizationInfoSectionProps
> = ({ profile, charityName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Check if there's any data to display
  const hasData = useMemo(() => {
    if (!profile) return false;
    return Boolean(
      profile.yearFounded ||
      profile.address?.street ||
      profile.address?.city ||
      profile.contact?.phone ||
      profile.contact?.email ||
      profile.contact?.website ||
      profile.socialLinks?.twitter ||
      profile.socialLinks?.facebook ||
      profile.socialLinks?.linkedin ||
      profile.socialLinks?.instagram,
    );
  }, [profile]);

  const formattedAddress = useMemo((): string | null => {
    if (!profile?.address) return null;

    const addr = profile.address;
    const parts = [
      addr.street,
      addr.city,
      addr.stateProvince,
      addr.postalCode,
      addr.country,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : null;
  }, [profile?.address]);

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-8">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg -m-2 p-2"
        aria-expanded={isExpanded}
        aria-controls="organization-info-content"
      >
        <div className="flex items-center gap-2">
          <Building2
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Find out more about {charityName}
          </h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
        )}
      </button>

      {isExpanded && (
        <div id="organization-info-content" className="mt-6 space-y-6">
          {/* Year Founded */}
          {profile?.yearFounded && (
            <div className="flex items-start gap-3">
              <Calendar
                className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Founded
                </dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {profile.yearFounded}
                </dd>
              </div>
            </div>
          )}

          {/* Address */}
          {formattedAddress && (
            <div className="flex items-start gap-3">
              <MapPin
                className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Address
                </dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  {formattedAddress}
                </dd>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {(profile?.contact?.phone ||
            profile?.contact?.email ||
            profile?.contact?.website) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile?.contact?.phone && (
                <div className="flex items-start gap-3">
                  <Phone
                    className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Phone
                    </dt>
                    <dd>
                      <a
                        href={`tel:${profile.contact.phone}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        {profile.contact.phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {profile?.contact?.email && (
                <div className="flex items-start gap-3">
                  <Mail
                    className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </dt>
                    <dd>
                      <a
                        href={`mailto:${profile.contact.email}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        {profile.contact.email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {profile?.contact?.website && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <Globe
                    className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Website
                    </dt>
                    <dd>
                      <a
                        href={profile.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                      >
                        {profile.contact.website}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Social Links */}
          {(profile?.socialLinks?.twitter ||
            profile?.socialLinks?.facebook ||
            profile?.socialLinks?.linkedin ||
            profile?.socialLinks?.instagram) && (
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Social Media
              </dt>
              <dd className="flex flex-wrap gap-4">
                {profile?.socialLinks?.twitter && (
                  <a
                    href={profile.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    aria-label="Public Feed"
                  >
                    <Rss className={SOCIAL_ICON_CLASS} aria-hidden="true" />
                    <span className="text-sm">Public Feed</span>
                  </a>
                )}
                {profile?.socialLinks?.linkedin && (
                  <a
                    href={profile.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    aria-label="Professional Network"
                  >
                    <Network className={SOCIAL_ICON_CLASS} aria-hidden="true" />
                    <span className="text-sm">Professional Network</span>
                  </a>
                )}
                {profile?.socialLinks?.facebook && (
                  <a
                    href={profile.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    aria-label="Community & Media"
                  >
                    <Users className={SOCIAL_ICON_CLASS} aria-hidden="true" />
                    <span className="text-sm">Community & Media</span>
                  </a>
                )}
                {profile?.socialLinks?.instagram && (
                  <a
                    href={profile.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    aria-label="Alternative & Regional"
                  >
                    <Link className={SOCIAL_ICON_CLASS} aria-hidden="true" />
                    <span className="text-sm">Alternative & Regional</span>
                  </a>
                )}
              </dd>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationInfoSection;

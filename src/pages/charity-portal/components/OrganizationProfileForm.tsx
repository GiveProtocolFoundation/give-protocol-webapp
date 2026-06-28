import React, { useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCountries } from "@/hooks/useCountries";
import { Calendar, MapPin, Phone, Globe } from "lucide-react";
import type {
  OrganizationProfile,
  OrganizationProfileFormData,
} from "@/types/charity";

interface OrganizationProfileFormProps {
  initialData: OrganizationProfile | null;
  onSave: (_data: OrganizationProfile) => Promise<void>;
  loading: boolean;
}

interface CountrySelectProps {
  label: string;
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  countries: { code: string; name: string }[];
}

/** Country dropdown styled to match the Input "enhanced" variant. */
const CountrySelect: React.FC<CountrySelectProps> = ({
  label,
  value,
  onChange,
  countries,
}) => {
  const id = React.useId();
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-[0.8rem] font-semibold text-slate-700 dark:text-gray-100 tracking-[0.01em]"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="block w-full font-sans text-[0.9rem] shadow-sm transition-all duration-200 focus:outline-none text-gray-900 dark:text-gray-100 border-[1.5px] border-slate-300 dark:border-white/10 rounded-[10px] px-[0.9rem] py-[0.7rem] bg-white dark:bg-[#0E1514] focus:border-emerald-500 dark:focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
      >
        <option value="">Select country</option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Validates a URL string
 * @param url - The URL to validate
 * @returns True if valid or empty
 */
function validateUrl(url: string): boolean {
  if (!url) return true;
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    return Boolean(new URL(normalizedUrl));
  } catch {
    return false;
  }
}

/**
 * Validates an email string using string methods to avoid ReDoS vulnerabilities
 * @param email - The email to validate
 * @returns True if valid or empty
 */
function validateEmail(email: string): boolean {
  if (!email) return true;

  // Check for whitespace
  if (/\s/.test(email)) return false;

  // Must have exactly one @
  const atIndex = email.indexOf("@");
  if (atIndex < 1 || atIndex !== email.lastIndexOf("@")) return false;

  const domain = email.slice(atIndex + 1);

  // Domain must have at least one dot, not at start/end
  const dotIndex = domain.indexOf(".");
  return dotIndex >= 1 && dotIndex !== domain.length - 1;
}

/**
 * Validates a phone number string
 * @param phone - The phone number to validate
 * @returns True if valid or empty
 */
function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-+()]+$/.test(phone);
}

/**
 * Validates a year string
 * @param year - The year to validate
 * @returns True if valid or empty
 */
function validateYear(year: string): boolean {
  if (!year) return true;
  const yearNum = Number.parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  return yearNum >= 1800 && yearNum <= currentYear;
}

/**
 * Editable form for the charity's public organization profile (year founded,
 * address, contact info, social links).
 * @param props.initialData - Existing profile values to seed the form, or null
 * @param props.onSave - Called with the validated profile when the user submits
 * @param props.loading - When true, disables the submit button and shows a saving state
 * @returns The organization profile form
 */
export const OrganizationProfileForm: React.FC<
  OrganizationProfileFormProps
> = ({ initialData, onSave, loading }) => {
  const { t } = useTranslation();
  const { countries } = useCountries();

  const initialFormData = useMemo(
    (): OrganizationProfileFormData => ({
      yearFounded: initialData?.yearFounded?.toString() || "",
      street: initialData?.address?.street || "",
      city: initialData?.address?.city || "",
      stateProvince: initialData?.address?.stateProvince || "",
      postalCode: initialData?.address?.postalCode || "",
      country: initialData?.address?.country || "",
      phone: initialData?.contact?.phone || "",
      email: initialData?.contact?.email || "",
      website: initialData?.contact?.website || "",
      twitter: initialData?.socialLinks?.twitter || "",
      facebook: initialData?.socialLinks?.facebook || "",
      linkedin: initialData?.socialLinks?.linkedin || "",
      instagram: initialData?.socialLinks?.instagram || "",
    }),
    [initialData],
  );

  const [formData, setFormData] =
    useState<OrganizationProfileFormData>(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof OrganizationProfileFormData, string>>
  >({});

  const handleFieldChange = useCallback(
    (field: keyof OrganizationProfileFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [],
  );

  const handleYearFoundedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("yearFounded", e.target.value);
    },
    [handleFieldChange],
  );

  const handleStreetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("street", e.target.value);
    },
    [handleFieldChange],
  );

  const handleCityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("city", e.target.value);
    },
    [handleFieldChange],
  );

  const handleStateProvinceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("stateProvince", e.target.value);
    },
    [handleFieldChange],
  );

  const handlePostalCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("postalCode", e.target.value);
    },
    [handleFieldChange],
  );

  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFieldChange("country", e.target.value);
    },
    [handleFieldChange],
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("phone", e.target.value);
    },
    [handleFieldChange],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("email", e.target.value);
    },
    [handleFieldChange],
  );

  const handleWebsiteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("website", e.target.value);
    },
    [handleFieldChange],
  );

  const handleTwitterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("twitter", e.target.value);
    },
    [handleFieldChange],
  );

  const handleFacebookChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("facebook", e.target.value);
    },
    [handleFieldChange],
  );

  const handleLinkedinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("linkedin", e.target.value);
    },
    [handleFieldChange],
  );

  const handleInstagramChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldChange("instagram", e.target.value);
    },
    [handleFieldChange],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Partial<
      Record<keyof OrganizationProfileFormData, string>
    > = {};

    if (!validateYear(formData.yearFounded)) {
      newErrors.yearFounded = t(
        "organization.invalidYear",
        "Please enter a valid year (1800 - current year)",
      );
    }
    if (!validateEmail(formData.email)) {
      newErrors.email = t(
        "organization.invalidEmail",
        "Please enter a valid email address",
      );
    }
    if (!validatePhone(formData.phone)) {
      newErrors.phone = t(
        "organization.invalidPhone",
        "Please enter a valid phone number",
      );
    }
    if (!validateUrl(formData.website)) {
      newErrors.website = t(
        "organization.invalidUrl",
        "Please enter a valid URL",
      );
    }
    if (!validateUrl(formData.twitter)) {
      newErrors.twitter = t(
        "organization.invalidUrl",
        "Please enter a valid URL",
      );
    }
    if (!validateUrl(formData.facebook)) {
      newErrors.facebook = t(
        "organization.invalidUrl",
        "Please enter a valid URL",
      );
    }
    if (!validateUrl(formData.linkedin)) {
      newErrors.linkedin = t(
        "organization.invalidUrl",
        "Please enter a valid URL",
      );
    }
    if (!validateUrl(formData.instagram)) {
      newErrors.instagram = t(
        "organization.invalidUrl",
        "Please enter a valid URL",
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const profileData: OrganizationProfile = {
        yearFounded: formData.yearFounded
          ? Number.parseInt(formData.yearFounded, 10)
          : undefined,
        address: {
          street: formData.street || undefined,
          city: formData.city || undefined,
          stateProvince: formData.stateProvince || undefined,
          postalCode: formData.postalCode || undefined,
          country: formData.country || undefined,
        },
        contact: {
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          website: formData.website || undefined,
        },
        socialLinks: {
          twitter: formData.twitter || undefined,
          facebook: formData.facebook || undefined,
          linkedin: formData.linkedin || undefined,
          instagram: formData.instagram || undefined,
        },
      };

      await onSave(profileData);
    },
    [formData, onSave, validate],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Year Founded Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("organization.yearFounded", "Year Founded")}
        </h3>
        <div className="max-w-xs">
          <Input
            variant="enhanced"
            label={t(
              "organization.yearFoundedLabel",
              "Year your organization was founded",
            )}
            type="number"
            min={1800}
            max={new Date().getFullYear()}
            value={formData.yearFounded}
            onChange={handleYearFoundedChange}
            error={errors.yearFounded}
            placeholder="e.g., 2010"
          />
        </div>
      </section>

      {/* Address Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("organization.address", "Address")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              variant="enhanced"
              label={t("organization.street", "Street Address")}
              value={formData.street}
              onChange={handleStreetChange}
              placeholder="123 Main Street"
            />
          </div>
          <Input
            variant="enhanced"
            label={t("organization.city", "City")}
            value={formData.city}
            onChange={handleCityChange}
            placeholder="San Francisco"
          />
          <Input
            variant="enhanced"
            label={t("organization.stateProvince", "State/Province")}
            value={formData.stateProvince}
            onChange={handleStateProvinceChange}
            placeholder="California"
          />
          <Input
            variant="enhanced"
            label={t("organization.postalCode", "Postal Code")}
            value={formData.postalCode}
            onChange={handlePostalCodeChange}
            placeholder="94102"
          />
          <CountrySelect
            label={t("organization.country", "Country")}
            value={formData.country}
            onChange={handleCountryChange}
            countries={countries}
          />
        </div>
      </section>

      {/* Contact Information Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("organization.contactInfo", "Contact Information")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            variant="enhanced"
            label={t("organization.phone", "Phone")}
            type="tel"
            value={formData.phone}
            onChange={handlePhoneChange}
            error={errors.phone}
            placeholder="+1 (555) 123-4567"
          />
          <Input
            variant="enhanced"
            label={t("organization.email", "Email")}
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            error={errors.email}
            placeholder="contact@organization.org"
          />
          <div className="md:col-span-2">
            <Input
              variant="enhanced"
              label={t("organization.website", "Website")}
              type="url"
              value={formData.website}
              onChange={handleWebsiteChange}
              error={errors.website}
              placeholder="https://www.organization.org"
            />
          </div>
        </div>
      </section>

      {/* Social Media Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-gray-400" aria-hidden="true" />
          {t("organization.socialMedia", "Social Media")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            variant="enhanced"
            label={t("organization.publicFeed", "Public Feed")}
            value={formData.twitter}
            onChange={handleTwitterChange}
            error={errors.twitter}
            placeholder="https://x.com/org, https://bsky.app/profile/org, or Mastodon URL..."
          />
          <Input
            variant="enhanced"
            label={t(
              "organization.professionalNetwork",
              "Professional Network",
            )}
            value={formData.linkedin}
            onChange={handleLinkedinChange}
            error={errors.linkedin}
            placeholder="https://linkedin.com/company/organization-name..."
          />
          <Input
            variant="enhanced"
            label={t("organization.communityMedia", "Community & Media")}
            value={formData.facebook}
            onChange={handleFacebookChange}
            error={errors.facebook}
            placeholder="https://instagram.com/org, facebook.com/org, or youtube.com/..."
          />
          <Input
            variant="enhanced"
            label={t(
              "organization.alternativeRegional",
              "Alternative & Regional",
            )}
            value={formData.instagram}
            onChange={handleInstagramChange}
            error={errors.instagram}
            placeholder="e.g., Sina Weibo, Discord, GitHub, Linktree, or Blog URL..."
          />
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button type="submit" disabled={loading} className="min-w-[150px]">
          {loading
            ? t("common.saving", "Saving...")
            : t("common.saveChanges", "Save Changes")}
        </Button>
      </div>
    </form>
  );
};

export default OrganizationProfileForm;

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/Button";
import {
  SelfReportedHoursInput,
  ActivityType,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_DESCRIPTIONS,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  calculateDaysUntilExpiration,
  isValidationExpired,
} from "@/types/selfReportedHours";
import { CharityOrgAutocomplete } from "./CharityOrgAutocomplete";
import type { CharityOrganization } from "@/types/charityOrganization";
import { DateHoursLocationRow } from "./DateHoursLocationRow";
import { validateSelfReportedHoursForm, isFormValid } from "./validation";
import { AlertTriangle, Building2, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SelfReportedHoursFormProps {
  initialData?: Partial<SelfReportedHoursInput>;
  onSubmit: (_input: SelfReportedHoursInput) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  isLoading?: boolean;
}

type OrgMode = "verified" | "other";

// Common input classes for consistency
const INPUT_BASE_CLASSES =
  "h-11 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:border-transparent";
const INPUT_WITH_ICON_CLASSES = `${INPUT_BASE_CLASSES} pl-10 pr-4`;

/**
 * Dropdown selector for choosing an activity type.
 * @param props - Dropdown state and callbacks
 * @returns Activity type dropdown element
 */
interface ActivityTypeDropdownProps {
  value: ActivityType;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (_type: ActivityType) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}

/** @param {ActivityTypeDropdownProps} props - Dropdown for selecting volunteer activity type */
const ActivityTypeDropdown: React.FC<ActivityTypeDropdownProps> = ({
  value,
  isOpen,
  onToggle,
  onSelect,
  dropdownRef,
}) => {
  const { t } = useTranslation();
  const handleOptionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const type = e.currentTarget.dataset.type as ActivityType;
      onSelect(type);
    },
    [onSelect],
  );

  return (
    <div ref={dropdownRef} className="relative">
      <label
        htmlFor="activityTypeButton"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {t("volunteer.activityType", "Activity Type")}{" "}
        <span className="text-red-500">*</span>
      </label>
      <button
        id="activityTypeButton"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={onToggle}
        className="w-full h-auto min-h-[2.75rem] flex items-center justify-between px-4 py-3 text-left rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:border-transparent"
      >
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900">
            {ACTIVITY_TYPE_LABELS[value]}
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            {ACTIVITY_TYPE_DESCRIPTIONS[value]}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <ul
          aria-labelledby="activityTypeButton"
          className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-black/30 border border-gray-100 dark:border-gray-700 max-h-72 overflow-auto list-none m-0 p-0"
        >
          {Object.values(ActivityType).map((type) => (
            <li key={type}>
              <button
                type="button"
                aria-current={value === type ? "true" : undefined}
                data-type={type}
                onClick={handleOptionClick}
                className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3 first:rounded-t-xl last:rounded-b-xl ${
                  value === type
                    ? "bg-emerald-50 dark:bg-emerald-900/30"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900">
                    {ACTIVITY_TYPE_LABELS[type]}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {ACTIVITY_TYPE_DESCRIPTIONS[type]}
                  </span>
                </div>
                {value === type && (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Segmented control for selecting an organization from the registry or entering manually.
 * @param props - Organization mode, field values, and callbacks
 * @returns Organization selector element
 */
interface OrganizationSelectorProps {
  orgMode: OrgMode;
  organizationName: string;
  organizationContactEmail: string;
  errors: Record<string, string>;
  onModeChange: (_mode: OrgMode) => void;
  onOrgSelect: (_org: CharityOrganization | null) => void;
  onInputChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** @param {OrganizationSelectorProps} props - Selector for choosing or entering an organization */
const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  orgMode,
  organizationName,
  organizationContactEmail,
  errors,
  onModeChange,
  onOrgSelect,
  onInputChange,
}) => {
  const { t } = useTranslation();
  const handleVerifiedClick = useCallback(() => {
    onModeChange("verified");
  }, [onModeChange]);

  const handleOtherClick = useCallback(() => {
    onModeChange("other");
  }, [onModeChange]);

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-gray-700 mb-3">
        <span className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          {t("volunteer.organization", "Organization")}{" "}
          <span className="text-red-500">*</span>
        </span>
      </legend>

      {/* Segmented Control */}
      <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-4">
        <label
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
            orgMode === "verified"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <input
            type="radio"
            name="orgMode"
            value="verified"
            checked={orgMode === "verified"}
            onChange={handleVerifiedClick}
            className="sr-only"
          />
          <span>{t("volunteer.searchRegistry", "Search Registry")}</span>
        </label>
        <label
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
            orgMode === "other"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <input
            type="radio"
            name="orgMode"
            value="other"
            checked={orgMode === "other"}
            onChange={handleOtherClick}
            className="sr-only"
          />
          <span>{t("volunteer.notListed", "Not Listed")}</span>
        </label>
      </div>

      {orgMode === "verified" ? (
        <CharityOrgAutocomplete
          onSelect={onOrgSelect}
          error={errors.organization}
        />
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("volunteer.organizationName", "Organization Name")}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                id="organizationName"
                name="organizationName"
                value={organizationName}
                onChange={onInputChange}
                placeholder={t(
                  "volunteer.enterOrgName",
                  "Enter organization name",
                )}
                required
                className={`${INPUT_WITH_ICON_CLASSES} ${errors.organizationName ? "border-red-300 focus:ring-red-500" : ""}`}
              />
            </div>
            {errors.organizationName && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.organizationName}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="organizationContactEmail"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("volunteer.contactEmail", "Contact Email")}{" "}
              <span className="text-gray-400 font-normal">
                {t("volunteer.contactEmailOptional", "(optional)")}
              </span>
            </label>
            <input
              id="organizationContactEmail"
              type="email"
              name="organizationContactEmail"
              value={organizationContactEmail}
              onChange={onInputChange}
              placeholder="org@example.com"
              className={INPUT_BASE_CLASSES}
            />
            <p className="mt-2 text-xs text-gray-500">
              {t(
                "volunteer.onboardHelp",
                "We may reach out to help onboard this organization",
              )}
            </p>
          </div>
        </div>
      )}
    </fieldset>
  );
};

/**
 * Displays a contextual banner indicating the validation status of the entry.
 * @param props - Current org mode, selection state, and expiration flag
 * @returns Validation preview banner or null
 */
interface ValidationPreviewProps {
  orgMode: OrgMode;
  hasOrganization: boolean;
  selectedOrgName: string | null;
  isExpired: boolean;
}

/** @param {ValidationPreviewProps} props - Preview of validation requirements and status */
const ValidationPreview: React.FC<ValidationPreviewProps> = ({
  orgMode,
  hasOrganization,
  selectedOrgName,
  isExpired,
}) => {
  const { t } = useTranslation();

  if (orgMode === "verified" && hasOrganization && !isExpired) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-4 py-3">
        <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" />
        {selectedOrgName
          ? t(
              "volunteer.submittedForValidationTo",
              "This record will be submitted for validation to {{org}}",
              { org: selectedOrgName },
            )
          : t(
              "volunteer.submittedForValidation",
              "This record will be submitted for validation",
            )}
      </div>
    );
  }

  if (orgMode === "verified" && isExpired) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-4 py-3">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {t(
          "volunteer.validationExpired",
          "Validation period has expired for this date",
        )}
      </div>
    );
  }

  if (orgMode === "other") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
        <span className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />{" "}
        {t(
          "volunteer.savedAsUnvalidated",
          "This record will be saved as unvalidated",
        )}
      </div>
    );
  }

  return null;
};

/**
 * Form component for creating or editing self-reported volunteer hours
 * @param props - Component props
 * @returns JSX element
 */
export const SelfReportedHoursForm: React.FC<SelfReportedHoursFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEdit = false,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<SelfReportedHoursInput>({
    activityDate: initialData?.activityDate || "",
    hours: initialData?.hours || 1,
    activityType: initialData?.activityType || ActivityType.DIRECT_SERVICE,
    description: initialData?.description || "",
    location: initialData?.location || "",
    organizationId: initialData?.organizationId,
    charityOrgId: initialData?.charityOrgId,
    organizationName: initialData?.organizationName,
    organizationContactEmail: initialData?.organizationContactEmail,
  });

  const [orgMode, setOrgMode] = useState<OrgMode>(
    initialData?.organizationId || initialData?.charityOrgId
      ? "verified"
      : "other",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    /** Closes the activity-type dropdown when the user clicks outside it. */
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActivityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate days since activity for warning
  const daysInfo = useMemo(() => {
    if (!formData.activityDate)
      return { daysSince: 0, daysLeft: undefined, isExpired: false };
    const daysSince = Math.floor(
      (new Date().getTime() - new Date(formData.activityDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const daysLeft = calculateDaysUntilExpiration(formData.activityDate);
    const expired = isValidationExpired(formData.activityDate);
    return { daysSince, daysLeft, isExpired: expired };
  }, [formData.activityDate]);

  const showExpirationWarning =
    daysInfo.daysLeft !== undefined &&
    daysInfo.daysLeft <= 10 &&
    !daysInfo.isExpired;

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: name === "hours" ? Number.parseFloat(value) || 0 : value,
      }));
      if (errors[name]) {
        setErrors((prev) => {
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [errors],
  );

  const handleActivityTypeSelect = useCallback((type: ActivityType) => {
    setFormData((prev) => ({ ...prev, activityType: type }));
    setActivityDropdownOpen(false);
  }, []);

  const handleOrganizationSelect = useCallback(
    (org: CharityOrganization | null) => {
      if (org) {
        setFormData((prev) => ({
          ...prev,
          charityOrgId: org.id,
          // When the registry org is also a platform account, use its profile UUID
          // for the validation flow; organizationName must be null per DB constraint.
          // When not on platform, store the display name in organizationName.
          organizationId:
            org.is_on_platform && org.platform_charity_id
              ? org.platform_charity_id
              : undefined,
          organizationName:
            org.is_on_platform && org.platform_charity_id
              ? undefined
              : org.name,
          organizationContactEmail: undefined,
        }));
        setSelectedOrgName(org.name);
      } else {
        setFormData((prev) => ({
          ...prev,
          charityOrgId: undefined,
          organizationId: undefined,
          organizationName: undefined,
        }));
        setSelectedOrgName(null);
      }
      if (errors.organization) {
        setErrors((prev) => {
          const { organization: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [errors],
  );

  const handleOrgModeChange = useCallback((mode: OrgMode) => {
    setOrgMode(mode);
    setFormData((prev) => ({
      ...prev,
      charityOrgId: undefined,
      organizationId: undefined,
      organizationName: mode === "other" ? "" : undefined,
      organizationContactEmail: undefined,
    }));
    setSelectedOrgName(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors = validateSelfReportedHoursForm(formData, orgMode);
    setErrors(newErrors);
    return isFormValid(newErrors);
  }, [formData, orgMode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      try {
        setSubmitting(true);
        await onSubmit(formData);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit],
  );

  const today = new Date().toISOString().split("T")[0];
  const charCount = formData.description.length;

  const toggleDropdown = useCallback(() => {
    setActivityDropdownOpen((prev) => !prev);
  }, []);

  // Character count status for description field
  const charCountStatus = useMemo(() => {
    if (charCount < MIN_DESCRIPTION_LENGTH) return "text-amber-500";
    if (charCount > MAX_DESCRIPTION_LENGTH - 50) return "text-amber-500";
    return "text-gray-400";
  }, [charCount]);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-black/30 overflow-hidden p-8 space-y-8"
    >
      {/* Date, Hours, Location Row */}
      <DateHoursLocationRow
        activityDate={formData.activityDate}
        hours={formData.hours}
        location={formData.location ?? ""}
        today={today}
        errors={errors}
        showExpirationWarning={showExpirationWarning}
        daysLeft={daysInfo.daysLeft}
        isExpired={daysInfo.isExpired}
        onInputChange={handleInputChange}
      />

      {/* Activity Type Dropdown */}
      <ActivityTypeDropdown
        value={formData.activityType}
        isOpen={activityDropdownOpen}
        onToggle={toggleDropdown}
        onSelect={handleActivityTypeSelect}
        dropdownRef={dropdownRef}
      />

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t("volunteer.description", "Description")}{" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:border-transparent ${
              errors.description !== undefined
                ? "border-red-300"
                : "border-gray-200"
            }`}
            required
            minLength={MIN_DESCRIPTION_LENGTH}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder={t(
              "volunteer.describeActivities",
              "Describe the activities you performed...",
            )}
          />
          {/* Character counter inside textarea */}
          <span
            className={`absolute bottom-3 right-3 text-xs pointer-events-none transition-colors ${charCountStatus}`}
          >
            {charCount}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        {errors.description !== undefined && (
          <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>
        )}
        {charCount < MIN_DESCRIPTION_LENGTH && charCount > 0 && (
          <p className="mt-1.5 text-xs text-gray-500">
            {t(
              "volunteer.moreCharsNeeded",
              "{{count}} more characters needed",
              { count: MIN_DESCRIPTION_LENGTH - charCount },
            )}
          </p>
        )}
      </div>

      {/* Organization Selection */}
      <OrganizationSelector
        orgMode={orgMode}
        organizationName={formData.organizationName ?? ""}
        organizationContactEmail={formData.organizationContactEmail ?? ""}
        errors={errors}
        onModeChange={handleOrgModeChange}
        onOrgSelect={handleOrganizationSelect}
        onInputChange={handleInputChange}
      />

      {/* Validation Status Preview */}
      <div className="pt-2">
        <ValidationPreview
          orgMode={orgMode}
          hasOrganization={
            Boolean(formData.charityOrgId) || Boolean(selectedOrgName)
          }
          selectedOrgName={selectedOrgName}
          isExpired={daysInfo.isExpired}
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 px-8 py-5 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting || isLoading}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          {t("common.cancel", "Cancel")}
        </button>
        <Button
          type="submit"
          disabled={
            submitting ||
            isLoading ||
            (daysInfo.isExpired && orgMode === "verified")
          }
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(() => {
            if (submitting || isLoading)
              return (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {isEdit
                    ? t("volunteer.updating", "Updating...")
                    : t("volunteer.logging", "Logging...")}
                </span>
              );
            return isEdit
              ? t("volunteer.updateHours", "Update Hours")
              : t("volunteer.logHoursButton", "Log Hours");
          })()}
        </Button>
      </div>
    </form>
  );
};

export default SelfReportedHoursForm;

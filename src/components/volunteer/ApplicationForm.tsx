import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logger } from "@/utils/logger";
import {
  validateEmail,
  validateName,
  validatePhoneNumber,
} from "@/utils/validation";
import { AlertCircle } from "lucide-react";
import { encryptVolunteerApplicationPII } from "@/utils/crypto/piiEncryption";
import { useTranslation } from "@/hooks/useTranslation";

interface ApplicationFormProps {
  opportunityId: string;
  opportunityTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ApplicationFormContentProps {
  formData: {
    fullName: string;
    phoneNumber: string;
    email: string;
    dateOfBirth: string;
    availability: {
      days: string[];
      times: string[];
    };
    commitmentType: string;
    experience: string;
    skills: string;
    certifications: string;
    interests: string;
    references: { id: string; name: string; contact: string }[];
    workSamples: string;
  };
  validationErrors: Record<string, string>;
  loading: boolean;
  inputClasses: string;
  textareaClasses: string;
  selectClasses: string;
  onSubmit: (_e: React.FormEvent) => void;
  onClose: () => void;
  handlers: {
    handleFullNameChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handlePhoneChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleEmailChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDateOfBirthChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDaysChange: (
      _day: string,
    ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleTimesChange: (
      _time: string,
    ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCommitmentChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleExperienceChange: (
      _e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => void;
    handleSkillsChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCertificationsChange: (
      _e: React.ChangeEvent<HTMLInputElement>,
    ) => void;
    handleInterestsChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleReferenceNameChange: (
      _index: number,
    ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleReferenceContactChange: (
      _index: number,
    ) => (_e: React.ChangeEvent<HTMLInputElement>) => void;
    handleWorkSamplesChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

/** Availability section with day/time checkboxes and commitment level select. */
const AvailabilitySection: React.FC<{
  formData: ApplicationFormContentProps["formData"];
  validationErrors: Record<string, string>;
  selectClasses: string;
  handlers: ApplicationFormContentProps["handlers"];
}> = ({ formData, validationErrors, selectClasses, handlers }) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">{t("volunteer.availabilityTitle", "Availability")}</h3>
    <p className="block text-sm font-medium text-gray-700 mb-1">
      {t("volunteer.preferredDays", "Preferred Days")}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {[
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ].map((day) => (
        <label key={day} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.availability.days.includes(day)}
            onChange={handlers.handleDaysChange(day)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2"
          />
          {day}
        </label>
      ))}
    </div>
    {validationErrors["availability.days"] && (
      <p className="text-sm text-red-600 mb-1">
        {validationErrors["availability.days"]}
      </p>
    )}
    <p className="block text-sm font-medium text-gray-700 mb-1 mt-4">
      {t("volunteer.preferredTimes", "Preferred Times")}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {["Morning", "Afternoon", "Evening"].map((time) => (
        <label key={time} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.availability.times.includes(time)}
            onChange={handlers.handleTimesChange(time)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2"
          />
          {time}
        </label>
      ))}
    </div>
    {validationErrors["availability.times"] && (
      <p className="text-sm text-red-600 mb-1">
        {validationErrors["availability.times"]}
      </p>
    )}
    <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">
      {t("volunteer.commitmentLevelLabel", "Commitment Level")}{" "}
      <select
        value={formData.commitmentType}
        onChange={handlers.handleCommitmentChange}
        className={`${selectClasses} mt-1`}
      >
        <option value="one-time">{t("volunteer.commitment.oneTime", "One-time")}</option>
        <option value="short-term">{t("volunteer.commitment.shortTerm", "Short-term")}</option>
        <option value="long-term">{t("volunteer.commitment.longTerm", "Long-term")}</option>
      </select>
    </label>
  </div>
  );
};

/** Form layout with personal info, availability, skills, references, and work samples fields. */
const ApplicationFormContent: React.FC<ApplicationFormContentProps> = ({
  formData,
  validationErrors,
  loading,
  inputClasses,
  textareaClasses,
  selectClasses,
  onSubmit,
  onClose,
  handlers,
}) => {
  const { t } = useTranslation();
  return (
  <form onSubmit={onSubmit} className="space-y-6">
    {/* Personal Information */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {t("volunteer.personalInfo", "Personal Information")}
      </h3>
      <Input
        label={t("volunteer.fullName", "Full Name *")}
        value={formData.fullName}
        onChange={handlers.handleFullNameChange}
        required
        className={inputClasses}
        error={validationErrors["fullName"]}
      />
      <Input
        label={t("volunteer.phoneRequired", "Phone Number *")}
        type="tel"
        value={formData.phoneNumber}
        onChange={handlers.handlePhoneChange}
        required
        className={inputClasses}
        error={validationErrors["phoneNumber"]}
      />
      <Input
        label={t("volunteer.emailRequired", "Email Address *")}
        type="email"
        value={formData.email}
        onChange={handlers.handleEmailChange}
        required
        className={inputClasses}
        error={validationErrors["email"]}
      />
      <Input
        label={t("volunteer.dateOfBirth", "Date of Birth")}
        type="date"
        value={formData.dateOfBirth}
        onChange={handlers.handleDateOfBirthChange}
        className={inputClasses}
      />
    </div>

    {/* Availability */}
    <AvailabilitySection
      formData={formData}
      validationErrors={validationErrors}
      selectClasses={selectClasses}
      handlers={handlers}
    />

    {/* Skills & Experience */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{t("volunteer.skillsAndExperience", "Skills & Experience")}</h3>
      <label className="block">
        <span className="text-sm font-medium text-gray-700 mb-1 block">
          {t("volunteer.relevantExperience", "Relevant Experience *")}
        </span>
        <textarea
          value={formData.experience}
          onChange={handlers.handleExperienceChange}
          rows={4}
          className={textareaClasses}
          required
        />
        {validationErrors["experience"] && (
          <p className="text-sm text-red-600 mb-1">
            {validationErrors["experience"]}
          </p>
        )}
      </label>
      <Input
        label={t("volunteer.skills", "Skills (comma-separated)")}
        value={formData.skills}
        onChange={handlers.handleSkillsChange}
        className={inputClasses}
      />
      <Input
        label={t("volunteer.certifications", "Certifications (comma-separated)")}
        value={formData.certifications}
        onChange={handlers.handleCertificationsChange}
        className={inputClasses}
      />
    </div>

    {/* Interests */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {t("volunteer.interestsAndPreferences", "Interests & Preferences")}
      </h3>
      <Input
        label={t("volunteer.areasOfInterest", "Areas of Interest (comma-separated)")}
        value={formData.interests}
        onChange={handlers.handleInterestsChange}
        className={inputClasses}
      />
    </div>

    {/* References */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{t("volunteer.referencesTitle", "References")}</h3>
      {formData.references.map((ref, index) => (
        <div key={ref.id} className="space-y-2">
          <Input
            label={t("volunteer.referenceName", "Reference {{index}} Name", { index: index + 1 })}
            value={ref.name}
            onChange={handlers.handleReferenceNameChange(index)}
            className={inputClasses}
          />
          <Input
            label={t("volunteer.referenceContact", "Reference {{index}} Contact", { index: index + 1 })}
            value={ref.contact}
            onChange={handlers.handleReferenceContactChange(index)}
            className={inputClasses}
          />
        </div>
      ))}
    </div>

    {/* Work Samples */}
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{t("volunteer.workSamplesTitle", "Work Samples")}</h3>
      <Input
        label={t("volunteer.workSamplesLabel", "Links to Work Samples (comma-separated)")}
        value={formData.workSamples}
        onChange={handlers.handleWorkSamplesChange}
        className={inputClasses}
      />
    </div>

    <div className="flex justify-end space-x-3">
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        {t("common.cancel", "Cancel")}
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? t("volunteer.submitting", "Submitting...") : t("volunteer.submitApplicationShort", "Submit Application")}
      </Button>
    </div>
  </form>
  );
};

/** Multi-step volunteer application form with validation and Supabase submission. */
export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  opportunityId,
  opportunityTitle,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    dateOfBirth: "",
    availability: {
      days: [] as string[],
      times: [] as string[],
    },
    commitmentType: "short-term",
    experience: "",
    skills: "",
    certifications: "",
    interests: "",
    references: [
      { id: "ref-1", name: "", contact: "" },
      { id: "ref-2", name: "", contact: "" },
    ],
    workSamples: "",
  });

  /** Validates a single form field and returns an error message or empty string. */
  const validateField = (
    name: string,
    value: string | number | boolean,
  ): string => {
    switch (name) {
      case "fullName":
        return validateName(value)
          ? ""
          : "Please enter a valid name (2-100 characters)";
      case "email":
        return validateEmail(value) ? "" : "Please enter a valid email address";
      case "phoneNumber":
        return validatePhoneNumber(value)
          ? ""
          : "Please enter a valid phone number";
      case "experience":
        return value.trim().length > 0
          ? ""
          : "Please provide information about your experience";
      default:
        return "";
    }
  };

  const handleInputChange = useCallback(
    (
      field: string,
      value: string | string[] | { name: string; contact: string }[],
    ) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear validation error for this field
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const { [field]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validationErrors],
  );

  // useCallback handlers for form inputs
  const handleFullNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("fullName", e.target.value);
    },
    [handleInputChange],
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("phoneNumber", e.target.value);
    },
    [handleInputChange],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("email", e.target.value);
    },
    [handleInputChange],
  );

  const handleDateOfBirthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("dateOfBirth", e.target.value);
    },
    [handleInputChange],
  );

  const handleDaysChange = useCallback(
    (day: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const days = e.target.checked
        ? [...formData.availability.days, day]
        : formData.availability.days.filter((d) => d !== day);
      handleInputChange("availability", {
        ...formData.availability,
        days,
      });
    },
    [formData.availability, handleInputChange],
  );

  const handleTimesChange = useCallback(
    (time: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const times = e.target.checked
        ? [...formData.availability.times, time]
        : formData.availability.times.filter((t) => t !== time);
      handleInputChange("availability", {
        ...formData.availability,
        times,
      });
    },
    [formData.availability, handleInputChange],
  );

  const handleCommitmentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleInputChange("commitmentType", e.target.value);
    },
    [handleInputChange],
  );

  const handleExperienceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange("experience", e.target.value);
    },
    [handleInputChange],
  );

  const handleSkillsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("skills", e.target.value);
    },
    [handleInputChange],
  );

  const handleCertificationsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("certifications", e.target.value);
    },
    [handleInputChange],
  );

  const handleInterestsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("interests", e.target.value);
    },
    [handleInputChange],
  );

  const handleReferenceNameChange = useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newReferences = [...formData.references];
      newReferences[index] = { ...newReferences[index], name: e.target.value };
      handleInputChange("references", newReferences);
    },
    [formData.references, handleInputChange],
  );

  const handleReferenceContactChange = useCallback(
    (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newReferences = [...formData.references];
      newReferences[index] = {
        ...newReferences[index],
        contact: e.target.value,
      };
      handleInputChange("references", newReferences);
    },
    [formData.references, handleInputChange],
  );

  const handleWorkSamplesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange("workSamples", e.target.value);
    },
    [handleInputChange],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !profile) {
        setError("User profile not found");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setValidationErrors({});

        // Validate all required fields
        const errors: Record<string, string> = {};

        const fieldsToValidate = [
          { name: "fullName", value: formData.fullName },
          { name: "email", value: formData.email },
          { name: "phoneNumber", value: formData.phoneNumber },
          { name: "experience", value: formData.experience },
        ];

        fieldsToValidate.forEach(({ name, value }) => {
          const error = validateField(name, value);
          if (error) {
            errors[name] = error;
          }
        });

        // Check if availability is selected
        if (formData.availability.days.length === 0) {
          errors["availability.days"] = "Please select at least one day";
        }

        if (formData.availability.times.length === 0) {
          errors["availability.times"] = "Please select at least one time";
        }

        // If there are validation errors, don't submit
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          throw new Error("Please correct the validation errors");
        }

        Logger.info("Submitting volunteer application", {
          opportunityId,
          applicantId: profile.id,
        });

        const encryptedPII = await encryptVolunteerApplicationPII({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phoneNumber || undefined,
        });

        const { error: submitError } = await supabase
          .from("volunteer_applications")
          .insert({
            opportunity_id: opportunityId,
            applicant_id: profile.id,
            ...encryptedPII,
            date_of_birth: formData.dateOfBirth || null,
            availability: {
              days: formData.availability.days,
              times: formData.availability.times,
            },
            commitment_type: formData.commitmentType,
            experience: formData.experience,
            skills: formData.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            certifications: formData.certifications
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
            interests: formData.interests
              .split(",")
              .map((i) => i.trim())
              .filter(Boolean),
            reference_contacts: formData.references,
            work_samples: formData.workSamples
              .split(",")
              .map((w) => w.trim())
              .filter(Boolean),
          });

        if (submitError) throw submitError;

        Logger.info("Volunteer application submitted", {
          opportunityId,
          applicantId: profile.id,
        });

        onSuccess?.();
        onClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to submit application";
        setError(message);
        Logger.error("Application submission failed", { error: err });
      } finally {
        setLoading(false);
      }
    },
    [formData, user, profile, opportunityId, onSuccess, onClose],
  );

  const inputClasses =
    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50 font-sans";
  const textareaClasses =
    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50 font-sans";
  const selectClasses =
    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50 font-sans";

  const handlers = {
    handleFullNameChange,
    handlePhoneChange,
    handleEmailChange,
    handleDateOfBirthChange,
    handleDaysChange,
    handleTimesChange,
    handleCommitmentChange,
    handleExperienceChange,
    handleSkillsChange,
    handleCertificationsChange,
    handleInterestsChange,
    handleReferenceNameChange,
    handleReferenceContactChange,
    handleWorkSamplesChange,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t("volunteer.applyForTitle", "Apply for: {{title}}", { title: opportunityTitle })}
        </h2>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ApplicationFormContent
          formData={formData}
          validationErrors={validationErrors}
          loading={loading}
          inputClasses={inputClasses}
          textareaClasses={textareaClasses}
          selectClasses={selectClasses}
          onSubmit={handleSubmit}
          onClose={onClose}
          handlers={handlers}
        />
      </div>
    </div>
  );
};

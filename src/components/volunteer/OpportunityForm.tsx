import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Editor } from "@/components/ui/Editor";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import {
  CommitmentType,
  OpportunityType,
  WorkLanguage,
} from "@/types/volunteer";
import { MAX_OPPORTUNITIES_PER_CHARITY } from "@/types/charity";
import { useTranslation } from "@/hooks/useTranslation";
import { Logger } from "@/utils/logger";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}

/** Labeled select field for opportunity form. */
const FormSelect: React.FC<FormSelectProps> = ({ label, name, value, onChange, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="block w-full border-[1.5px] border-[#e1e4e8] rounded-lg px-4 py-3 text-base transition-all duration-200 bg-[#fafbfc] focus:border-[#0366d6] focus:shadow-[0_0_0_3px_rgba(3,102,214,0.1)] focus:bg-white focus:outline-none"
      required
    >
      {children}
    </select>
  </div>
);

interface OpportunityFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/** Form for creating new volunteer opportunities with validation and limit checking. */
export const OpportunityForm: React.FC<OpportunityFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    title: "",
    description: "<p></p>", // Empty paragraph for Tiptap editor
    skills: "",
    commitment: CommitmentType.SHORT_TERM,
    location: "",
    type: OpportunityType.REMOTE,
    workLanguage: WorkLanguage.ENGLISH,
    imageUrl: "",
    imagePath: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [activeOpportunityCount, setActiveOpportunityCount] =
    useState<number>(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  // Check how many active opportunities the charity already has
  useEffect(() => {
    /** Checks the charity's active opportunity count against the maximum allowed. */
    const checkOpportunityLimit = async () => {
      if (!profile?.id) {
        setCheckingLimit(false);
        return;
      }

      try {
        const { count, error: countError } = await supabase
          .from("volunteer_opportunities")
          .select("*", { count: "exact", head: true })
          .eq("charity_id", profile.id)
          .eq("status", "active");

        if (countError) {
          Logger.warn("Error checking opportunity count", {
            error: countError,
          });
        } else {
          setActiveOpportunityCount(count ?? 0);
        }
      } catch (err) {
        Logger.warn("Exception checking opportunity count", { error: err });
      } finally {
        setCheckingLimit(false);
      }
    };

    checkOpportunityLimit();
  }, [profile?.id]);

  const hasReachedLimit =
    activeOpportunityCount >= MAX_OPPORTUNITIES_PER_CHARITY;

  // Safely strip HTML by removing individual characters that could form HTML
  // This prevents incomplete multi-character sanitization vulnerabilities
  const stripHtmlTags = (input: string): string => {
    // Remove all < and > characters which are the core of HTML tags
    // This is more secure than trying to match complete tag patterns
    return input.replaceAll(/[<>]/g, "");
  };

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case "title":
        return value.trim().length > 0 ? "" : t("volunteer.validation.titleRequired", "Title is required");
      case "description": {
        // Safely strip HTML tags to check if there's actual content
        const textContent = stripHtmlTags(value).trim();
        return textContent.length > 0 ? "" : t("volunteer.validation.descriptionRequired", "Description is required");
      }
      case "skills":
        return value.trim().length > 0 ? "" : t("volunteer.validation.skillsRequired", "At least one skill is required");
      case "location":
        return value.trim().length > 0 ? "" : t("volunteer.validation.locationRequired", "Location is required");
      default:
        return "";
    }
  }, [t]);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear validation error for this field
      if (validationErrors[name]) {
        setValidationErrors((prev) => {
          const { [name]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [validationErrors],
  );

  const handleDescriptionChange = useCallback(
    (content: string) => {
      setFormData((prev) => ({ ...prev, description: content }));
      // Clear validation error for description
      if (validationErrors.description) {
        setValidationErrors((prev) => {
          const { description: _description, ...rest } = prev;
          return rest;
        });
      }
    },
    [validationErrors.description],
  );

  const handleImageChange = useCallback(
    (url: string | null, path: string | null) => {
      setFormData((prev) => ({
        ...prev,
        imageUrl: url ?? "",
        imagePath: path ?? "",
      }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!profile?.id) {
        setError(t("volunteer.profileNotFound", "User profile not found"));
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setValidationErrors({});

        // Validate all required fields
        const errors: Record<string, string> = {};

        const fieldsToValidate = [
          { name: "title", value: formData.title },
          { name: "description", value: formData.description },
          { name: "skills", value: formData.skills },
          { name: "location", value: formData.location },
        ];

        fieldsToValidate.forEach(({ name, value }) => {
          const error = validateField(name, value);
          if (error) {
            errors[name] = error;
          }
        });

        // If there are validation errors, don't submit
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          throw new Error(t("volunteer.correctErrors", "Please correct the validation errors"));
        }

        Logger.info("Creating volunteer opportunity", {
          charityId: profile.id,
          title: formData.title.trim(),
        });

        const { error: submitError } = await supabase
          .from("volunteer_opportunities")
          .insert({
            charity_id: profile.id,
            title: formData.title.trim(),
            description: formData.description.trim(),
            skills: formData.skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            commitment: formData.commitment,
            location: formData.location.trim(),
            type: formData.type,
            work_language: formData.workLanguage,
            status: "active",
            image_url: formData.imageUrl || null,
            image_path: formData.imagePath || null,
          });

        if (submitError) throw submitError;

        Logger.info("Volunteer opportunity created", {
          charityId: profile.id,
          title: formData.title,
        });

        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/charity-portal");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : t("volunteer.createFailed", "Failed to create opportunity");
        setError(errorMessage);
        Logger.error("Failed to create volunteer opportunity", { error: err });
      } finally {
        setLoading(false);
      }
    },
    [formData, profile?.id, onSuccess, navigate, validateField],
  );

  /** Converts a snake_case language code to Title Case display name. */
  const formatLanguageName = (language: string): string => {
    return language
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  /** Returns the appropriate submit button label based on form state. */
  const getSubmitButtonText = (): string => {
    if (loading) {
      return t("common.creating", "Creating...");
    }
    if (checkingLimit) {
      return t("common.loading", "Loading...");
    }
    return t("volunteer.createOpportunity", "Create Opportunity");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        {t("volunteer.createOpportunity", "Create Volunteer Opportunity")}
      </h2>

      {hasReachedLimit && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
          <p>
            <span className="font-medium block">
              {t("volunteer.limitReached", "Opportunity Limit Reached")}
            </span>
            <span className="text-sm mt-1 block">
              {t(
                "volunteer.limitReachedMessage",
                `You have reached the maximum of ${MAX_OPPORTUNITIES_PER_CHARITY} active volunteer opportunities. Please close or complete an existing opportunity before creating a new one.`,
              )}
            </span>
          </p>
        </div>
      )}

      {!hasReachedLimit && !checkingLimit && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
          {t(
            "volunteer.opportunityCount",
            `You have ${activeOpportunityCount} of ${MAX_OPPORTUNITIES_PER_CHARITY} active opportunities.`,
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
        <Input
          label={t("volunteer.opportunityTitle", "Opportunity Title")}
          name="title"
          value={formData.title}
          onChange={handleChange}
          variant="enhanced"
          required
          error={validationErrors["title"]}
        />

        <div>
          <label
            htmlFor="opportunity-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("volunteer.description", "Description")}
          </label>
          <Editor
            id="opportunity-description"
            content={formData.description}
            onChange={handleDescriptionChange}
            placeholder={t("volunteer.descriptionPlaceholder", "Describe the volunteer opportunity in detail...")}
            variant="enhanced"
          />
          {validationErrors["description"] && (
            <p className="mt-1 text-sm text-red-600">
              {validationErrors["description"]}
            </p>
          )}
        </div>

        <ImageUpload
          value={formData.imageUrl}
          onChange={handleImageChange}
          folder={`opportunities/${profile?.id ?? "unknown"}`}
          label={t("volunteer.headerImage", "Header Image")}
          helpText={t(
            "volunteer.headerImageHelp",
            "Upload an image to display at the top of your opportunity listing",
          )}
        />

        <Input
          label={t("volunteer.skills", "Skills (comma-separated)")}
          name="skills"
          value={formData.skills}
          onChange={handleChange}
          variant="enhanced"
          placeholder={t("volunteer.skillsPlaceholder", "e.g., Web Development, Project Management, Translation")}
          required
          error={validationErrors["skills"]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSelect
            label={t("volunteer.commitment", "Commitment")}
            name="commitment"
            value={formData.commitment}
            onChange={handleChange}
          >
            <option value={CommitmentType.ONE_TIME}>
              {t("volunteer.commitment.oneTime", "One-time")}
            </option>
            <option value={CommitmentType.SHORT_TERM}>
              {t("volunteer.commitment.shortTerm", "Short-term")}
            </option>
            <option value={CommitmentType.LONG_TERM}>
              {t("volunteer.commitment.longTerm", "Long-term")}
            </option>
          </FormSelect>

          <FormSelect
            label={t("volunteer.type", "Type")}
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <option value={OpportunityType.REMOTE}>
              {t("volunteer.type.remote", "Remote")}
            </option>
            <option value={OpportunityType.ONSITE}>
              {t("volunteer.type.onsite", "Onsite")}
            </option>
            <option value={OpportunityType.HYBRID}>
              {t("volunteer.type.hybrid", "Hybrid")}
            </option>
          </FormSelect>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={t("volunteer.location", "Location")}
            name="location"
            value={formData.location}
            onChange={handleChange}
            variant="enhanced"
            placeholder={t("volunteer.locationPlaceholder", "e.g., Remote, New York, Berlin")}
            required
            error={validationErrors["location"]}
          />

          <FormSelect
            label={t("volunteer.workLanguage", "Work Language")}
            name="workLanguage"
            value={formData.workLanguage}
            onChange={handleChange}
          >
            {Object.values(WorkLanguage).map((language) => (
              <option key={language} value={language}>
                {t(`language.${language}`, formatLanguageName(language))}
              </option>
            ))}
          </FormSelect>
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t("common.cancel", "Cancel")}
            </Button>
          )}

          <Button
            type="submit"
            disabled={loading || hasReachedLimit || checkingLimit}
          >
            {getSubmitButtonText()}
          </Button>
        </div>
    </form>
  );
};

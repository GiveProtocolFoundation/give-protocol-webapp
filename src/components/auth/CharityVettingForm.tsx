import React, { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { useCountries } from "@/hooks/useCountries";
import {
  validateEmail,
  validatePassword,
  validateName,
} from "@/utils/validation";
import { AlertCircle } from "lucide-react";

interface CountrySelectProps {
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  countries: { code: string; name: string }[];
  error?: string;
}

/** Country dropdown selector with validation error display. */
function CountrySelect({
  value,
  onChange,
  countries,
  error,
}: CountrySelectProps) {
  const { t } = useTranslation();
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 mb-1 block">
        {t("charity.vetting.countryLabel")}
      </span>
      <select
        name="country"
        value={value}
        onChange={onChange}
        className="block w-full border border-slate-200 dark:border-gray-600 shadow-none bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 focus:border-emerald-600 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100"
        required
      >
        <option value="">{t("charity.vetting.selectCountry")}</option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </label>
  );
}

/**
 * CharityVettingForm component
 *
 * Renders the charity vetting form for organizations to submit information.
 *
 * @returns {JSX.Element} The charity vetting form component.
 */
export const CharityVettingForm: React.FC = () => {
  const { register, loading } = useAuth();
  const { t } = useTranslation();
  const { countries } = useCountries();
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [formData, setFormData] = useState({
    organizationName: "",
    description: "",
    category: "",
    streetAddress: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    taxId: "",
    contactName: "",
    contactEmail: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setError("");

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

  const validateField = useCallback(
    (name: string, value: string): string => {
      switch (name) {
        case "organizationName":
          return validateName(value)
            ? ""
            : t(
                "charity.vetting.validation.orgName",
                "Organization name must be between 2 and 100 characters",
              );
        case "contactName":
          return validateName(value)
            ? ""
            : t(
                "charity.vetting.validation.contactName",
                "Contact name must be between 2 and 100 characters",
              );
        case "contactEmail":
          return validateEmail(value)
            ? ""
            : t(
                "charity.vetting.validation.email",
                "Please enter a valid email address",
              );
        case "password":
          return validatePassword(value)
            ? ""
            : t(
                "charity.vetting.validation.password",
                "Password must be at least 8 characters long",
              );
        case "confirmPassword":
          return value === formData.password
            ? ""
            : t(
                "charity.vetting.validation.confirmPassword",
                "Passwords do not match",
              );
        default:
          return "";
      }
    },
    [formData.password, t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setValidationErrors({});

      // Validate all fields
      const errors: Record<string, string> = {};

      // Required fields to validate
      const fieldsToValidate = [
        { name: "organizationName", value: formData.organizationName },
        { name: "contactName", value: formData.contactName },
        { name: "contactEmail", value: formData.contactEmail },
        { name: "password", value: formData.password },
        { name: "confirmPassword", value: formData.confirmPassword },
      ];

      fieldsToValidate.forEach(({ name, value }) => {
        const fieldError = validateField(name, value);
        if (fieldError) {
          errors[name] = fieldError;
        }
      });

      // Additional required fields
      if (!formData.description.trim()) {
        errors["description"] = t("charity.vetting.validation.description");
      }

      if (!formData.category) {
        errors["category"] = t("charity.vetting.validation.category");
      }

      if (!formData.taxId.trim()) {
        errors["taxId"] = t("charity.vetting.validation.taxId");
      }

      if (!formData.streetAddress.trim()) {
        errors["streetAddress"] = t("charity.vetting.validation.streetAddress");
      }

      if (!formData.city.trim()) {
        errors["city"] = t("charity.vetting.validation.city");
      }

      if (!formData.country) {
        errors["country"] = t("charity.vetting.validation.country");
      }

      // If there are validation errors, don't submit
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError(t("charity.vetting.validation.fix"));
        return;
      }

      try {
        await register(formData.contactEmail, formData.password, "charity", {
          organizationName: formData.organizationName,
          description: formData.description,
          category: formData.category,
          type: "charity", // Explicitly set type to ensure it's stored in metadata
          address: {
            street: formData.streetAddress,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            postalCode: formData.postalCode,
          },
          taxId: formData.taxId,
          contact: {
            name: formData.contactName,
          },
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("charity.vetting.error.generic");
        setError(message);
      }
    },
    [formData, register, validateField, t],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900">
        {t("charity.vetting.orgDetails")}
      </h3>
      <Input
        label={t("charity.vetting.orgName")}
        name="organizationName"
        variant="fintech"
        value={formData.organizationName}
        onChange={handleChange}
        required
        error={validationErrors["organizationName"]}
      />

      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t("charity.vetting.description")}{" "}
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="block w-full border border-slate-200 dark:border-gray-600 shadow-none bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 focus:border-emerald-600 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 mt-1"
          required
        />
        {validationErrors["description"] && (
          <p className="mt-1 text-sm text-red-600">
            {validationErrors["description"]}
          </p>
        )}
      </label>

      <Input
        label="Category of Entity"
        name="category"
        variant="fintech"
        value={formData.category}
        onChange={handleChange}
        required
        error={validationErrors["category"]}
      />

      <Input
        label={t("charity.vetting.taxId")}
        name="taxId"
        variant="fintech"
        value={formData.taxId}
        onChange={handleChange}
        required
        error={validationErrors["taxId"]}
      />

      <h3 className="text-lg font-semibold text-gray-900">
        {t("charity.vetting.address")}
      </h3>
      <Input
        label={t("charity.vetting.streetAddress")}
        name="streetAddress"
        variant="fintech"
        value={formData.streetAddress}
        onChange={handleChange}
        required
        error={validationErrors["streetAddress"]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t("charity.vetting.city")}
          name="city"
          variant="fintech"
          value={formData.city}
          onChange={handleChange}
          required
          error={validationErrors["city"]}
        />
        <Input
          label={t("charity.vetting.state")}
          name="state"
          variant="fintech"
          value={formData.state}
          onChange={handleChange}
          required
          error={validationErrors["state"]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CountrySelect
          value={formData.country}
          onChange={handleChange}
          countries={countries}
          error={validationErrors["country"]}
        />
        <Input
          label={t("charity.vetting.postalCode")}
          name="postalCode"
          variant="fintech"
          value={formData.postalCode}
          onChange={handleChange}
          required
          error={validationErrors["postalCode"]}
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900">
        {t("charity.vetting.contactInfo")}
      </h3>
      <Input
        label={t("charity.vetting.contactName")}
        name="contactName"
        variant="fintech"
        value={formData.contactName}
        onChange={handleChange}
        required
        error={validationErrors["contactName"]}
      />
      <Input
        label={t("charity.vetting.contactEmail")}
        type="email"
        name="contactEmail"
        variant="fintech"
        value={formData.contactEmail}
        onChange={handleChange}
        required
        error={validationErrors["contactEmail"]}
      />
      <h3 className="text-lg font-semibold text-gray-900">
        {t("charity.vetting.accountSecurity")}
      </h3>
      <div className="space-y-1">
        <Input
          label={t("charity.vetting.password")}
          type="password"
          name="password"
          variant="fintech"
          value={formData.password}
          onChange={handleChange}
          required
          error={validationErrors["password"]}
        />
        <PasswordStrengthBar password={formData.password} />
      </div>
      <Input
        label={t("charity.vetting.confirmPassword")}
        type="password"
        name="confirmPassword"
        variant="fintech"
        value={formData.confirmPassword}
        onChange={handleChange}
        required
        error={validationErrors["confirmPassword"]}
      />

      <Button
        type="submit"
        className="w-full bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-700 shadow-none hover:from-emerald-600 hover:to-emerald-700 hover:shadow-none"
        disabled={loading}
      >
        {loading
          ? t("charity.vetting.submitting")
          : t("charity.vetting.submit")}
      </Button>
    </form>
  );
};

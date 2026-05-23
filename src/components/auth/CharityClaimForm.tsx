import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";
import { supabase } from "@/lib/supabase";
import {
  validateEmail,
  validatePassword,
  validateName,
} from "@/utils/validation";
import { Logger } from "@/utils/logger";
import type { CharityOrganization } from "@/types/charityOrganization";

interface CharityClaimFormProps {
  organization: CharityOrganization;
  onBack: () => void;
}

/** Read-only organization details panel. */
const RegistryDetailsPanel: React.FC<{
  organization: CharityOrganization;
  registryLocation: string;
}> = ({ organization, registryLocation }) => (
  <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-1">
    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
      Organization Details (from Registry)
    </h3>
    <p>
      <span className="font-medium text-gray-700">Name:</span>{" "}
      {organization.name}
    </p>
    <p>
      <span className="font-medium text-gray-700">EIN:</span> {organization.ein}
    </p>
    {registryLocation && (
      <p>
        <span className="font-medium text-gray-700">Location:</span>{" "}
        {registryLocation}
      </p>
    )}
  </div>
);

/**
 * Claim registration form for a charity found via IRS search.
 * Displays read-only IRS data and collects contact/password fields.
 * @param props - Component props
 * @param props.organization - The IRS organization to claim
 * @param props.onBack - Called when user clicks back to search
 * @returns The rendered claim form
 */
export const CharityClaimForm: React.FC<CharityClaimFormProps> = ({
  organization,
  onBack,
}) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [formData, setFormData] = useState({
    contactName: "",
    contactEmail: "",
    password: "",
    confirmPassword: "",
  });

  const registryLocation = [
    organization.city,
    organization.state,
    organization.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setError("");

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
        case "contactName":
          return validateName(value)
            ? ""
            : "Name must be between 2 and 100 characters";
        case "contactEmail":
          return validateEmail(value)
            ? ""
            : "Please enter a valid email address";
        case "password":
          return validatePassword(value)
            ? ""
            : "Password must be at least 8 characters long";
        case "confirmPassword":
          return value === formData.password ? "" : "Passwords do not match";
        default:
          return "";
      }
    },
    [formData.password],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setValidationErrors({});

      const errors: Record<string, string> = {};
      const fieldsToValidate = [
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

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setError("Please correct the validation errors");
        return;
      }

      setSubmitting(true);

      try {
        // 1. Sign up the user
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: formData.contactEmail,
            password: formData.password,
            options: {
              data: {
                type: "charity",
                organizationName: organization.name,
                ein: organization.ein,
              },
            },
          });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        const userId = signUpData.user?.id;
        if (!userId) {
          setError("Account creation failed");
          return;
        }

        // 2. Create profiles row
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({ user_id: userId, type: "charity" });

        if (profileError) {
          Logger.error("Failed to create profile row", { error: profileError });
        }

        // 3. Ensure charity_profiles row exists
        const { error: getOrCreateError } = await supabase.rpc(
          "get_or_create_charity_profile",
          {
            lookup_ein: organization.ein,
          },
        );

        if (getOrCreateError) {
          Logger.error("Failed to get/create charity profile", {
            error: getOrCreateError,
          });
        }

        // 4. Claim the charity profile (p_signer_phone required by SQL function)
        const { error: claimError } = await supabase.rpc(
          "claim_charity_profile",
          {
            p_ein: organization.ein,
            p_signer_name: formData.contactName,
            p_signer_email: formData.contactEmail,
            p_signer_phone: null,
          },
        );

        if (claimError) {
          Logger.error("Failed to claim charity profile via RPC", {
            error: claimError,
          });
          // Direct-update fallback: link the profile row when the RPC fails
          // (e.g. due to SQL function parameter issues). Only updates rows
          // where claimed_by is currently NULL to prevent hijacking.
          const { error: fallbackError } = await supabase
            .from("charity_profiles")
            .update({
              claimed_by: userId,
              authorized_signer_name: formData.contactName,
              authorized_signer_email: formData.contactEmail,
              status: "claimed-pending",
            })
            .eq("ein", organization.ein)
            .is("claimed_by", null);

          if (fallbackError) {
            Logger.error("Claim fallback direct update also failed", {
              error: fallbackError,
            });
          } else {
            Logger.info("Claim fallback succeeded via direct update", {
              ein: organization.ein,
            });
          }
        }

        navigate(
          `/auth/registration-success?type=charity-claim&email=${encodeURIComponent(formData.contactEmail)}`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create account";
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, organization, validateField, navigate],
  );

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4 mr-1" />
        Back to search
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <RegistryDetailsPanel
          organization={organization}
          registryLocation={registryLocation}
        />

        <h3 className="text-lg font-semibold text-gray-900">
          Contact Information
        </h3>
        <Input
          label="Contact Name"
          name="contactName"
          variant="fintech"
          value={formData.contactName}
          onChange={handleChange}
          required
          error={validationErrors["contactName"]}
        />
        <Input
          label="Contact Email"
          type="email"
          name="contactEmail"
          variant="fintech"
          value={formData.contactEmail}
          onChange={handleChange}
          required
          error={validationErrors["contactEmail"]}
        />
        <h3 className="text-lg font-semibold text-gray-900">
          Account Security
        </h3>
        <div className="space-y-1">
          <Input
            label="Password"
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
          label="Confirm Password"
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
          disabled={submitting}
        >
          {submitting ? "Creating Account..." : "Claim Organization"}
        </Button>
      </form>
    </>
  );
};

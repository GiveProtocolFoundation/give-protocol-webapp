import React, { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateEmail } from "@/utils/validation";

type ForgotType = "password" | "username";

interface ForgotCredentialsProps {
  type: ForgotType;
  onBack: () => void;
}

/**
 * Shared component for handling forgot password and username flows
 * @param type - Whether this is for password reset or username reminder
 * @param onBack - Callback function to navigate back to sign in
 */
export const ForgotCredentials: React.FC<ForgotCredentialsProps> = ({
  type,
  onBack,
}) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { resetPassword, sendUsernameReminder, loading } = useAuth();
  const { t } = useTranslation();

  const isPassword = type === "password";
  const title = isPassword ? t("auth.forgot.resetPassword") : t("auth.forgot.forgotUsername");
  const description = isPassword
    ? t("auth.forgot.passwordDesc")
    : t("auth.forgot.usernameDesc");
  const successMessage = isPassword
    ? t("auth.forgot.passwordSuccess")
    : t("auth.forgot.usernameSuccess");

  /**
   * Handles form submission for password reset or username reminder
   * @param e - Form submission event
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!validateEmail(email)) {
        setError(t("auth.validation.invalidEmail"));
        return;
      }

      try {
        if (isPassword) {
          await resetPassword(email);
        } else {
          await sendUsernameReminder(email);
        }
        setSubmitted(true);
      } catch (_err) {
        setError(t("auth.forgot.genericError"));
      }
    },
    [email, isPassword, resetPassword, sendUsernameReminder, t],
  );

  /**
   * Handles email input change
   * @param e - Input change event
   */
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    [],
  );

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("auth.forgot.checkEmail")}
        </h3>
        <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
        <Button onClick={onBack} variant="ghost" className="w-full">
          <ArrowLeft aria-hidden="true" className="w-4 h-4 mr-2" />
          {t("auth.forgot.backToSignIn")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" size="sm" className="mb-4">
          <ArrowLeft aria-hidden="true" className="w-4 h-4 mr-2" />
          {t("auth.forgot.backToSignIn")}
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            label={t("common.email")}
            placeholder={t("auth.forgot.emailPlaceholder")}
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
            className="w-full"
            required
          />
        </div>

        {error && <div role="alert" className="text-sm text-red-600">{error}</div>}

        <Button type="submit" className="w-full min-h-[48px]" disabled={loading} aria-busy={loading}>
          {loading
            ? t("auth.forgot.sending")
            : isPassword
              ? t("auth.forgot.sendResetLink")
              : t("auth.forgot.sendUsername")}
        </Button>
      </form>
    </div>
  );
};

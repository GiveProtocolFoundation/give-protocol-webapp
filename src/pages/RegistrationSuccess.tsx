import React, { useState, useCallback, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

const REDIRECT_COUNTDOWN_S = 5;

type RegistrationType = "charity-vetting" | "charity-claim" | "donor";

interface RoleGuidance {
  heading: string;
  message: string;
  nextSteps: string;
}

const ROLE_GUIDANCE: Record<RegistrationType, RoleGuidance> = {
  "charity-vetting": {
    heading: "Application Submitted",
    message:
      "Your application has been submitted and is under review. Once verified, you will receive an email with access to your Charity Portal.",
    nextSteps:
      "Our team will review your application and reach out via email with next steps.",
  },
  "charity-claim": {
    heading: "Claim Submitted",
    message:
      "Your claim has been submitted. Once verified, you will receive access to manage your organization.",
    nextSteps:
      "Our team will verify your claim and grant you access once confirmed.",
  },
  donor: {
    heading: "Welcome to Give Protocol",
    message:
      "After verifying your email, you can start exploring charities and making donations.",
    nextSteps:
      "Check your inbox and click the verification link to get started.",
  },
};

/**
 * RegistrationSuccess page shown after any registration flow completes.
 * Reads `type` and `email` from URL query params so the page survives refresh.
 *
 * @returns {JSX.Element} The registration success confirmation page.
 */
const RegistrationSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawType = searchParams.get("type") ?? "donor";
  const email = searchParams.get("email") ?? "";

  const registrationType: RegistrationType =
    rawType === "charity-vetting" || rawType === "charity-claim"
      ? rawType
      : "donor";

  const guidance = ROLE_GUIDANCE[registrationType];

  const [countdown, setCountdown] = useState(REDIRECT_COUNTDOWN_S);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      navigate("/auth", { replace: true });
    }
  }, [countdown, navigate]);

  const [resendState, setResendState] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [resendError, setResendError] = useState("");

  const handleResend = useCallback(async () => {
    if (!email) {
      setResendError("No email address found. Please return to login.");
      return;
    }
    setResendState("loading");
    setResendError("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setResendError(error.message);
      setResendState("error");
    } else {
      setResendState("sent");
    }
  }, [email]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-100 rounded-full p-4">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Account created successfully
        </h1>
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">
          {guidance.heading}
        </h2>

        {/* Email info */}
        {email && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-500">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>
        )}

        {/* Instruction */}
        <p className="text-gray-600 mb-4">
          Please check your email to verify your account.
        </p>

        {/* Role-specific next steps */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-emerald-800">{guidance.message}</p>
        </div>

        <p className="text-xs text-gray-500 mb-6">{guidance.nextSteps}</p>

        {/* Resend button */}
        {resendState === "sent" ? (
          <div className="flex items-center justify-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>Verification email sent! Please check your inbox.</span>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleResend}
            disabled={resendState === "loading"}
            icon={<RefreshCw className="h-4 w-4" />}
            className="mb-4"
          >
            {resendState === "loading"
              ? "Sending..."
              : "Resend verification email"}
          </Button>
        )}

        {resendError && (
          <p className="text-sm text-red-600 mb-4">{resendError}</p>
        )}

        {/* Return to login */}
        <Link
          to="/auth"
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline"
        >
          Return to login
        </Link>

        <p className="text-xs text-gray-400 mt-4">
          Redirecting to login in {countdown}s...
        </p>
      </div>
    </div>
  );
};

export default RegistrationSuccess;

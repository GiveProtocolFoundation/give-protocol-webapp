import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getCharityProfileByEin } from "@/services/charityProfileService";
import { submitCharityRequest } from "@/services/charityDataService";
import { useAuth } from "@/contexts/AuthContext";
import type { CharityProfile } from "@/types/charityProfile";

const STEPS = [
  "Verify Identity",
  "Confirm Organization",
  "Wallet Setup",
  "Complete",
];

const ROLE_OPTIONS = [
  "Executive Director",
  "Staff",
  "Board Member",
  "Volunteer",
  "Other",
];

/** Step indicator showing progress through the claim flow. */
const StepIndicator: React.FC = () => (
  <div className="flex items-center gap-2">
    {STEPS.map((step, i) => (
      <React.Fragment key={step}>
        <div
          className={`flex items-center gap-1.5 text-xs font-medium ${
            i === 0 ? "text-emerald-700" : "text-gray-400"
          }`}
        >
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
              i === 0
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {i + 1}
          </span>
          <span className="hidden sm:inline">{step}</span>
        </div>
        {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
      </React.Fragment>
    ))}
  </div>
);

/** Step 1 form for verifying identity during charity claim flow. */
const VerifyIdentityStep: React.FC<{
  role: string;
  onRoleChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  email: string;
  onEmailChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}> = ({
  role,
  onRoleChange,
  email,
  onEmailChange,
  onSubmit,
  submitting,
  submitted,
  error,
}) => {
  const isValid = role.length > 0 && email.length > 0;

  return (
    <Card hover={false} className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Step 1: Verify Your Identity
      </h2>

      <div>
        <label
          htmlFor="claim-role"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your role at this organization
        </label>
        <select
          id="claim-role"
          value={role}
          onChange={onRoleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        >
          <option value="">Select a role...</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="claim-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Work email address
        </label>
        <input
          id="claim-email"
          type="email"
          value={email}
          onChange={onEmailChange}
          placeholder="you@organization.org"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Your email domain will be cross-referenced with the
          organization&apos;s public records.
        </p>
      </div>

      {error !== null && <p className="text-xs text-red-600">{error}</p>}

      {submitted ? (
        <p className="text-sm text-emerald-700 text-center font-medium">
          Request submitted! We will review your claim and follow up at {email}.
        </p>
      ) : (
        <Button fullWidth disabled={!isValid || submitting} onClick={onSubmit}>
          {submitting ? "Submitting…" : "Continue"}
        </Button>
      )}
    </Card>
  );
};

/**
 * Page for the charity claim flow at /claim/:ein.
 * Displays the org info, step indicator, and identity verification form.
 * Submits the claim request to the platform for review.
 * @returns The rendered claim page
 */
function ClaimCharity() {
  const { ein } = useParams<{ ein: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CharityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!ein) {
      setLoading(false);
      return;
    }
    const result = await getCharityProfileByEin(ein);
    if (result) {
      setProfile(result);
    }
    setLoading(false);
  }, [ein]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    document.title = "Claim Organization | Give Protocol";
    return () => {
      document.title = "Give Protocol";
    };
  }, []);

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRole(e.target.value);
    },
    [],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!role || !email) return;
    if (!ein) return;
    if (!user?.id) {
      setSubmitError("You must be signed in to claim an organization.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const ok = await submitCharityRequest(ein, user.id, email || undefined);
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
      navigate(
        `/auth/registration-success?type=charity-claim&email=${encodeURIComponent(email)}`,
        { replace: true },
      );
    } else {
      setSubmitError("Could not submit your request. Please try again.");
    }
  }, [role, email, ein, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
      {/* Header */}
      <h1 className="font-serif text-2xl font-bold text-gray-900">
        Claim Organization
      </h1>
      {profile && (
        <p className="-mt-4 text-sm text-gray-500">
          {profile.name} · EIN {ein}
        </p>
      )}

      {/* Step indicator */}
      <StepIndicator />

      {/* Step 1 form */}
      <VerifyIdentityStep
        role={role}
        onRoleChange={handleRoleChange}
        email={email}
        onEmailChange={handleEmailChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitted={submitted}
        error={submitError}
      />
    </div>
  );
}

export default ClaimCharity;

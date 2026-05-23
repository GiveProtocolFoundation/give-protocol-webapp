import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cancelWalletChangeByToken } from "@/services/walletDesignationService";

type CancelPhase = "loading" | "success" | "failure";

/**
 * Landing page hit by the cancel magic link in cooldown / reminder emails.
 * Reads ?token=... from the URL, calls wallet-designation-cancel, and
 * renders success / failure.
 */
const CancelWalletChange: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [phase, setPhase] = useState<CancelPhase>("loading");
  const [error, setError] = useState<string | null>(null);

  const goToPortal = useCallback(() => {
    navigate("/charity-portal");
  }, [navigate]);

  const runCancel = useCallback(async (t: string) => {
    const result = await cancelWalletChangeByToken(t);
    if (result.ok) {
      setPhase("success");
    } else {
      setError(result.error);
      setPhase("failure");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Missing cancel token");
      setPhase("failure");
      return;
    }
    runCancel(token);
  }, [token, runCancel]);

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 py-12">
      <Card hover={false} className="w-full max-w-md p-8 text-center">
        {phase === "loading" && (
          <>
            <Loader2
              className="h-10 w-10 text-accent-base animate-spin mx-auto"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-lg font-semibold text-content-primary">
              Cancelling wallet change…
            </h1>
          </>
        )}
        {phase === "success" && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2
                className="h-7 w-7 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-content-primary">
              Wallet change cancelled
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Your charity&apos;s current receiving wallet is unchanged.
              Donations continue to flow to the existing address.
            </p>
            <p className="mt-2 text-xs text-content-muted">
              We&apos;ve sent your authorized signer a confirmation email with
              the cancelling IP for audit.
            </p>
            <Button onClick={goToPortal} className="mt-6" fullWidth>
              Back to charity portal
            </Button>
          </>
        )}
        {phase === "failure" && (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle
                className="h-7 w-7 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-content-primary">
              Could not cancel
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              {error ?? "Something went wrong."}
            </p>
            <p className="mt-2 text-xs text-content-muted">
              If the cooldown already completed and the change went live, you
              can start a new change from the charity portal to reverse it.
            </p>
            <Button onClick={goToPortal} className="mt-6" fullWidth>
              Go to charity portal
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default CancelWalletChange;

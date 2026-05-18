import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { confirmWalletByToken } from "@/services/walletDesignationService";

type ConfirmationPhase = "loading" | "success" | "failure";

/**
 * Landing page hit by the email magic link. Reads ?token=... from the URL,
 * calls wallet-designation-confirm, and renders success / failure.
 */
const ConfirmWalletDesignation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [phase, setPhase] = useState<ConfirmationPhase>("loading");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToPortal = useCallback(() => {
    navigate("/charity-portal");
  }, [navigate]);

  const runConfirmation = useCallback(async (t: string) => {
    const result = await confirmWalletByToken(t);
    if (result.ok) {
      setWalletAddress(result.data.walletAddress);
      setPhase("success");
    } else {
      setError(result.error);
      setPhase("failure");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Missing confirmation token");
      setPhase("failure");
      return;
    }
    runConfirmation(token);
  }, [token, runConfirmation]);

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
              Confirming wallet…
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
              Wallet activated
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Donations to your charity are now enabled. The official
              receiving wallet is:
            </p>
            <p className="mt-3 font-mono text-xs text-content-primary break-all bg-surface-sunken rounded p-3">
              {walletAddress}
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
              Could not confirm wallet
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              {error ?? "Something went wrong."}
            </p>
            <p className="mt-2 text-xs text-content-muted">
              If the link expired, you can restart the designation flow from
              the charity portal.
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

export default ConfirmWalletDesignation;

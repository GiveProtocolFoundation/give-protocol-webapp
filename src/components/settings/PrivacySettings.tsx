import React, { useState, useCallback, useEffect } from "react";
import {
  Shield,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";
import {
  requestDataExport,
  getExportStatus,
  requestAccountErasure,
  cancelErasureRequest,
  getActiveErasureRequest,
  getMostRecentExportRequest,
  type ExportRequestResult,
} from "@/services/privacyRequestService";

type ErasureStep =
  | "idle"
  | "warning"
  | "blockchain-warning"
  | "confirm"
  | "submitting";
type ExportState = "idle" | "requesting" | "pending" | "ready";

/** Privacy settings section — GDPR data export and account erasure. */
export const PrivacySettings: React.FC = () => {
  const { showToast } = useToast();

  // Export state
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportResult, setExportResult] = useState<ExportRequestResult | null>(
    null,
  );
  const [exportRequestId, setExportRequestId] = useState<string | null>(null);

  // Erasure state
  const [erasureStep, setErasureStep] = useState<ErasureStep>("idle");
  const [confirmText, setConfirmText] = useState("");
  const [erasureRequestId, setErasureRequestId] = useState<string | null>(null);
  const [erasureScheduledDate, setErasureScheduledDate] = useState<
    string | null
  >(null);
  const [isCancellingErasure, setIsCancellingErasure] = useState(false);

  // Load existing requests on mount
  useEffect(() => {
    let cancelled = false;

    /** Fetches any active erasure or export request on mount */
    const loadExistingRequests = async (): Promise<void> => {
      try {
        const [erasureRequest, exportRequest] = await Promise.all([
          getActiveErasureRequest(),
          getMostRecentExportRequest(),
        ]);

        if (cancelled) return;

        if (erasureRequest) {
          setErasureRequestId(erasureRequest.id);
          setErasureScheduledDate(erasureRequest.scheduled_deletion_date);
          setErasureStep("idle");
        }

        if (
          exportRequest &&
          exportRequest.status !== "expired" &&
          exportRequest.status !== "failed"
        ) {
          setExportRequestId(exportRequest.id);
          if (exportRequest.status === "ready") {
            setExportState("ready");
          } else {
            setExportState("pending");
          }
        }
      } catch {
        // Non-fatal — user can still attempt actions
      }
    };

    loadExistingRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Export handlers ─────────────────────────────────────────────────────────

  const handleRequestExport = useCallback(async () => {
    setExportState("requesting");
    try {
      const result = await requestDataExport();
      setExportResult(result);
      setExportRequestId(result.request_id);

      if (result.status === "ready") {
        setExportState("ready");
        showToast("success", "Your data export is ready for download.");
      } else {
        setExportState("pending");
        showToast("success", "Your data export request has been submitted.");
      }
    } catch (err) {
      setExportState("idle");
      showToast(
        "error",
        "Export failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }, [showToast]);

  const handleCheckExportStatus = useCallback(async () => {
    if (!exportRequestId) return;
    try {
      const result = await getExportStatus(exportRequestId);
      setExportResult(result as ExportRequestResult);
      if (result.status === "ready") {
        setExportState("ready");
      }
    } catch (err) {
      showToast(
        "error",
        "Failed to check status",
        err instanceof Error ? err.message : "",
      );
    }
  }, [exportRequestId, showToast]);

  // ── Erasure handlers ────────────────────────────────────────────────────────

  const handleErasureStart = useCallback(() => {
    setErasureStep("warning");
    setConfirmText("");
  }, []);

  const handleErasureWarningNext = useCallback(() => {
    setErasureStep("blockchain-warning");
  }, []);

  const handleBlockchainWarningNext = useCallback(() => {
    setErasureStep("confirm");
  }, []);

  const handleErasureCancel = useCallback(() => {
    setErasureStep("idle");
    setConfirmText("");
  }, []);

  const handleConfirmTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmText(e.target.value);
    },
    [],
  );

  const handleSubmitErasure = useCallback(async () => {
    if (confirmText !== "DELETE") return;
    setErasureStep("submitting");
    try {
      const result = await requestAccountErasure();
      setErasureRequestId(result.request_id);
      setErasureScheduledDate(result.scheduled_deletion_date ?? null);
      setErasureStep("idle");
      showToast(
        "success",
        "Account deletion request submitted. You have 30 days to cancel.",
      );
    } catch (err) {
      setErasureStep("confirm");
      showToast(
        "error",
        "Failed to submit deletion request",
        err instanceof Error ? err.message : "",
      );
    }
  }, [confirmText, showToast]);

  const handleCancelErasure = useCallback(async () => {
    if (!erasureRequestId) return;
    setIsCancellingErasure(true);
    try {
      await cancelErasureRequest(erasureRequestId);
      setErasureRequestId(null);
      setErasureScheduledDate(null);
      showToast(
        "success",
        "Account deletion cancelled. Your account is now active.",
      );
    } catch (err) {
      showToast(
        "error",
        "Failed to cancel deletion",
        err instanceof Error ? err.message : "",
      );
    } finally {
      setIsCancellingErasure(false);
    }
  }, [erasureRequestId, showToast]);

  const formattedDeletionDate = erasureScheduledDate
    ? new Date(erasureScheduledDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card className="p-6">
      <div className="flex items-center mb-6">
        <Shield className="h-5 w-5 text-gray-500 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Privacy
        </h2>
      </div>

      {/* ── Download My Data ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Download My Data
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download a copy of all data we hold about you (GDPR Art. 20). You may
          submit one export request every 30 days. The download link expires
          after 24 hours.
        </p>

        {exportState === "idle" && (
          <Button
            variant="secondary"
            onClick={handleRequestExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Request Data Export
          </Button>
        )}

        {exportState === "requesting" && (
          <Button
            variant="secondary"
            disabled
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4 animate-spin" />
            Generating export…
          </Button>
        )}

        {exportState === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Your export is being prepared.
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCheckExportStatus}
            >
              Check Status
            </Button>
          </div>
        )}

        {exportState === "ready" && exportResult?.download_url && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Your export is ready.
              {exportResult.expires_at && (
                <span className="text-gray-500 dark:text-gray-400">
                  Expires {new Date(exportResult.expires_at).toLocaleString()}.
                </span>
              )}
            </div>
            <a
              href={exportResult.download_url}
              download="give-protocol-data-export.json"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                         bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Export
            </a>
          </div>
        )}
      </section>

      <hr className="border-gray-200 dark:border-gray-700 mb-8" />

      {/* ── Delete My Account ────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Delete My Account
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated personal data (GDPR
          Art. 17). A 30-day cooling-off period applies before deletion occurs.
        </p>

        {/* Active erasure request banner */}
        {erasureRequestId !== null && erasureStep === "idle" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Account deletion pending
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                    Your account is scheduled for deletion on{" "}
                    <strong>{formattedDeletionDate}</strong>. You can cancel
                    this request before that date.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelErasure}
                disabled={isCancellingErasure}
                className="flex items-center gap-1 text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
              >
                <X className="h-3 w-3" />
                {isCancellingErasure ? "Cancelling…" : "Cancel Deletion"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Initial delete button */}
        {erasureStep === "idle" && erasureRequestId === null && (
          <Button
            variant="secondary"
            onClick={handleErasureStart}
            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
            Delete My Account
          </Button>
        )}

        {/* Step 2: Warning about data loss */}
        {erasureStep === "warning" && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  What will be permanently deleted
                </p>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Your profile, preferences, and contact information</li>
                  <li>Wallet address to identity mapping</li>
                  <li>Volunteer application PII (name, email, phone)</li>
                  <li>Volunteer hour history</li>
                  <li>Your Give Protocol account and login access</li>
                </ul>
                <p className="mt-3 text-sm font-semibold text-red-900 dark:text-red-100">
                  What will be retained
                </p>
                <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>
                    Fiat donation records (anonymized — your name and email
                    removed; transaction amounts and payment references retained
                    for financial and tax compliance)
                  </li>
                  <li>
                    Volunteer application records (anonymized — charity
                    operational records)
                  </li>
                  <li>
                    Volunteer verification records (blockchain audit metadata
                    only — personal link severed)
                  </li>
                  <li>Consent records (required by law)</li>
                </ul>
                <p className="mt-3 text-xs text-red-700 dark:text-red-300 italic">
                  Fiat donation transaction amounts and payment references will
                  be anonymized (your name and email removed) and retained for
                  up to 7 years for financial and tax compliance obligations
                  under applicable law (GDPR Art. 17(2)/(3)(b)).
                </p>
                {/* Warn if user is charity authorized signer */}
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    If you are an authorized signer for a charity, your signer
                    information will be anonymized. The charity profile will
                    remain active but will need a new authorized signer.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleErasureWarningNext}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                I understand, continue
              </Button>
              <Button variant="secondary" onClick={handleErasureCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Blockchain warning */}
        {erasureStep === "blockchain-warning" && (
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Important: Blockchain records are permanent
                </p>
                <p className="mt-2 text-sm text-purple-700 dark:text-purple-300">
                  Your volunteer verification records on the blockchain are
                  permanent by design and cannot be deleted. This is a technical
                  limitation of blockchain technology and is covered by GDPR
                  Article 17(3)(b) (legal obligation basis).
                </p>
                <p className="mt-2 text-sm text-purple-700 dark:text-purple-300">
                  However, your personal information will be removed from our
                  systems and the link between your identity and on-chain
                  records will be severed.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleBlockchainWarningNext}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                I understand, continue
              </Button>
              <Button variant="secondary" onClick={handleErasureCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Final confirmation */}
        {(erasureStep === "confirm" || erasureStep === "submitting") && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Confirm account deletion
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  A 30-day cooling-off period applies. Your account will not be
                  deleted immediately and you may cancel during this period.
                </p>
                <p className="mt-3 text-sm font-medium text-red-900 dark:text-red-100">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={handleConfirmTextChange}
                  placeholder="Type DELETE"
                  disabled={erasureStep === "submitting"}
                  className="mt-2 w-full max-w-xs px-3 py-2 text-sm border border-red-300 rounded-lg
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-red-400
                             disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSubmitErasure}
                disabled={
                  confirmText !== "DELETE" || erasureStep === "submitting"
                }
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white border-0 flex items-center gap-2"
              >
                {erasureStep === "submitting" ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit Deletion Request"
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleErasureCancel}
                disabled={erasureStep === "submitting"}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </Card>
  );
};

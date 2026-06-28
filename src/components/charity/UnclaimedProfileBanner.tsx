import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { submitRemovalRequest } from "@/services/charityDataService";
import { useToast } from "@/hooks/useToast";

/** Content of the removal request modal with reason textarea and submit/cancel buttons. */
const RemovalModalContent: React.FC<{
  removalReason: string;
  onReasonChange: (_e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}> = ({ removalReason, onReasonChange, onClose, onSubmit, submitting }) => (
  <div className="p-5 space-y-4">
    <p className="text-sm text-content-secondary">
      Explain why this organization should be removed from Give Protocol.
    </p>
    <textarea
      value={removalReason}
      onChange={onReasonChange}
      placeholder="Please describe your reason..."
      rows={4}
      className="w-full px-3 py-2 bg-surface-raised text-content-primary placeholder:text-content-muted border border-line-strong dark:border-line-subtle/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-base/30 focus:border-accent-base resize-none"
    />
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={onSubmit}
        disabled={submitting || !removalReason.trim()}
      >
        {submitting ? "Submitting..." : "Submit request"}
      </Button>
    </div>
  </div>
);

interface UnclaimedProfileBannerProps {
  ein: string;
}

/** Action buttons for the unclaimed profile banner. */
const BannerActions: React.FC<{
  onClaim: () => void;
  onOpenRemoval: () => void;
}> = ({ onClaim, onOpenRemoval }) => (
  <div className="flex flex-col sm:flex-row gap-2 mt-3">
    <Button size="sm" onClick={onClaim}>
      Claim this profile
    </Button>
    <Button variant="ghost" size="sm" onClick={onOpenRemoval}>
      Request removal
    </Button>
  </div>
);

/** Inner content of the unclaimed profile banner with claim and removal actions. */
const BannerContent: React.FC<{
  onDismiss: () => void;
  onClaim: () => void;
  onOpenRemoval: () => void;
}> = ({ onDismiss, onClaim, onOpenRemoval }) => (
  <div className="relative rounded-lg bg-accent-subtle/40 dark:bg-accent-subtle/20 border border-line-accent/40 p-4 md:p-5">
    <button
      type="button"
      onClick={onDismiss}
      className="absolute top-3 right-3 text-content-muted hover:text-content-primary transition-colors"
      aria-label="Dismiss"
    >
      <X className="h-4 w-4" />
    </button>
    <div className="flex items-start gap-3 pr-6">
      <Building2
        aria-hidden="true"
        className="h-5 w-5 text-accent-base shrink-0 mt-0.5"
      />
      <div>
        <p className="font-semibold text-content-primary text-sm">
          Are you affiliated with this organization?
        </p>
        <p className="mt-1 text-sm text-content-secondary">
          Claim this profile to manage it, add your mission and photos, and
          start receiving donations — or request removal if it&apos;s listed in
          error.
        </p>
        <BannerActions onClaim={onClaim} onOpenRemoval={onOpenRemoval} />
      </div>
    </div>
  </div>
);

/**
 * Dismissible banner shown at the top of unclaimed charity profiles.
 * Offers "Claim this profile" and "Request removal" actions.
 * @param props - Component props
 * @param props.ein - The charity's EIN
 * @returns The rendered banner or null if dismissed
 */
export const UnclaimedProfileBanner: React.FC<UnclaimedProfileBannerProps> = ({
  ein,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [removalReason, setRemovalReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleClaim = useCallback(() => {
    navigate(`/claim/${ein}`);
  }, [navigate, ein]);

  const handleOpenRemoval = useCallback(() => {
    setShowRemovalModal(true);
  }, []);

  const handleCloseRemoval = useCallback(() => {
    setShowRemovalModal(false);
    setRemovalReason("");
  }, []);

  const handleRemovalReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRemovalReason(e.target.value);
    },
    [],
  );

  const handleSubmitRemoval = useCallback(async () => {
    if (!removalReason.trim()) return;
    setSubmitting(true);
    const success = await submitRemovalRequest(ein, removalReason.trim());
    setSubmitting(false);
    if (success) {
      showToast(
        "success",
        "Request submitted",
        "We will review your removal request.",
      );
      handleCloseRemoval();
    } else {
      showToast("error", "Failed to submit", "Please try again later.");
    }
  }, [ein, removalReason, showToast, handleCloseRemoval]);

  if (dismissed) return null;

  return (
    <>
      <BannerContent
        onDismiss={handleDismiss}
        onClaim={handleClaim}
        onOpenRemoval={handleOpenRemoval}
      />

      <Modal
        isOpen={showRemovalModal}
        onClose={handleCloseRemoval}
        title="Request Profile Removal"
        size="sm"
      >
        <RemovalModalContent
          removalReason={removalReason}
          onReasonChange={handleRemovalReasonChange}
          onClose={handleCloseRemoval}
          onSubmit={handleSubmitRemoval}
          submitting={submitting}
        />
      </Modal>
    </>
  );
};

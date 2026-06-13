import React, { useState, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { RejectionReasonSelect } from "./RejectionReasonSelect";
import {
  RejectionReason,
  ValidationQueueItem,
  ACTIVITY_TYPE_LABELS,
} from "@/types/selfReportedHours";
import { formatDate } from "@/utils/date";
import {
  X,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
} from "lucide-react";

interface ValidationResponseModalProps {
  item: ValidationQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (_requestId: string) => Promise<boolean>;
  onReject: (
    _requestId: string,
    _reason: RejectionReason,
    _notes?: string,
  ) => Promise<boolean>;
}

/** Single field in the activity details grid showing an icon, label, and value. */
function ActivityDetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * Modal for approving or rejecting validation requests
 * @param props - Component props
 * @returns JSX element
 */
export const ValidationResponseModal: React.FC<
  ValidationResponseModalProps
> = ({ item, isOpen, onClose, onApprove, onReject }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"view" | "reject">("view");
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | "">(
    "",
  );
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = useCallback(async () => {
    try {
      setProcessing(true);
      const success = await onApprove(item.id);
      if (success) {
        onClose();
      }
    } finally {
      setProcessing(false);
    }
  }, [item.id, onApprove, onClose]);

  const handleStartReject = useCallback(() => {
    setMode("reject");
    setError("");
  }, []);

  const handleCancelReject = useCallback(() => {
    setMode("view");
    setRejectionReason("");
    setRejectionNotes("");
    setError("");
  }, []);

  const handleConfirmReject = useCallback(async () => {
    if (!rejectionReason) {
      setError(t("modal.validation.selectReasonError"));
      return;
    }

    try {
      setProcessing(true);
      const success = await onReject(
        item.id,
        rejectionReason,
        rejectionNotes || undefined,
      );
      if (success) {
        onClose();
      }
    } finally {
      setProcessing(false);
    }
  }, [item.id, rejectionReason, rejectionNotes, onReject, onClose, t]);

  const handleReasonChange = useCallback((reason: RejectionReason | "") => {
    setRejectionReason(reason);
    if (reason) setError("");
  }, []);

  const handleNotesChange = useCallback((notes: string) => {
    setRejectionNotes(notes);
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const activityTypeLabel =
    ACTIVITY_TYPE_LABELS[item.activityType] || "Unknown";

  return (
    <div
      role="presentation"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <dialog
        open
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-0 p-0"
        aria-modal="true"
        aria-labelledby="validation-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2
            id="validation-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            {mode === "reject"
              ? t("modal.validation.rejectTitle")
              : t("modal.validation.reviewTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === "view" ? (
            <>
              {/* Volunteer Info */}
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {t("modal.validation.volunteer")}
              </h3>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {item.volunteerName}
                  </p>
                </div>
              </div>

              {/* Activity Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  {t("modal.validation.activityDetails")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <ActivityDetailField
                    icon={Calendar}
                    label={t("modal.validation.date")}
                    value={formatDate(item.activityDate, false)}
                  />
                  <ActivityDetailField
                    icon={Clock}
                    label={t("modal.validation.hours")}
                    value={`${item.hours} ${item.hours === 1 ? t("modal.validation.hour") : t("modal.validation.hours")}`}
                  />
                  <ActivityDetailField
                    icon={FileText}
                    label={t("modal.validation.activityType")}
                    value={activityTypeLabel}
                  />
                  {item.location && (
                    <ActivityDetailField
                      icon={MapPin}
                      label={t("modal.validation.location")}
                      value={item.location}
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {t("modal.validation.description")}
                </h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-4">
                  {item.description}
                </p>
              </div>

              {/* Request Info */}
              <div className="text-sm text-gray-500 mb-6">
                <p>
                  {t("modal.validation.submitted")}{" "}
                  {formatDate(item.createdAt, true)}
                  {item.daysRemaining !== undefined && (
                    <span className="ml-2 text-amber-600">
                      {t("modal.validation.daysRemaining", {
                        count: item.daysRemaining,
                      })}
                    </span>
                  )}
                </p>
                {item.isResubmission && (
                  <p className="mt-1 text-amber-600 font-medium">
                    {t("modal.validation.appealNote")}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Rejection Form */
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                {t("modal.validation.rejectPrompt")}
              </p>
              <RejectionReasonSelect
                value={rejectionReason}
                notes={rejectionNotes}
                onReasonChange={handleReasonChange}
                onNotesChange={handleNotesChange}
                error={error}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {mode === "view" ? (
            <>
              <Button
                variant="secondary"
                onClick={handleStartReject}
                disabled={processing}
                icon={<XCircle className="h-4 w-4" />}
              >
                {t("modal.validation.reject")}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                icon={<CheckCircle className="h-4 w-4" />}
              >
                {processing
                  ? t("modal.validation.processing")
                  : t("modal.validation.approve")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={handleCancelReject}
                disabled={processing}
              >
                {t("modal.validation.back")}
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmReject}
                disabled={processing || !rejectionReason}
              >
                {processing
                  ? t("modal.validation.processing")
                  : t("modal.validation.confirmRejection")}
              </Button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
};

export default ValidationResponseModal;

import React, { useState, useCallback, useEffect } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import {
  submitCharityRequest,
  hasUserRequestedCharity,
} from "@/services/charityDataService";

interface RequestCharityWidgetProps {
  ein: string;
  charityName: string;
}

/**
 * Information-only widget shown in the sidebar for unclaimed charity profiles.
 * Replaces the DonateWidget. Lets authenticated users request that the
 * charity be contacted and onboarded onto the platform.
 * @param props - Component props
 * @returns The rendered request widget
 */
export const RequestCharityWidget: React.FC<RequestCharityWidgetProps> = ({
  ein,
  charityName,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    hasUserRequestedCharity(ein, user.id).then((already) => {
      if (!cancelled && already) {
        setRequested(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ein, user?.id]);

  const handleRequest = useCallback(async () => {
    if (!user?.id) {
      showToast(
        "info",
        "Sign in required",
        "Please sign in to request this charity.",
      );
      return;
    }

    setSubmitting(true);
    const success = await submitCharityRequest(ein, user.id);
    setSubmitting(false);

    if (success) {
      setRequested(true);
      showToast({
        type: "success",
        title: "Verification email sent",
        message: "Check your inbox — the link expires in 24 hours.",
      });
    } else {
      showToast({
        type: "error",
        title: "Submission failed",
        message: "Please try again later.",
      });
    }
  }, [ein, user?.id, showToast]);

  return (
    <Card hover={false} className="p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Information Only
      </h3>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          This organization has not yet claimed their profile on Give Protocol.
          Donations are not available until the charity is verified.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Let us know you&apos;re interested and we&apos;ll reach out to them on
          your behalf.
        </p>

        {requested ? (
          <Button
            fullWidth
            disabled
            icon={<CheckCircle className="h-4 w-4" />}
          >
            Requested
          </Button>
        ) : (
          <Button
            fullWidth
            onClick={handleRequest}
            disabled={submitting}
            icon={<Send className="h-4 w-4" />}
          >
            {submitting ? "Submitting..." : "Request this Charity"}
          </Button>
        )}
      </div>
    </Card>
  );
};

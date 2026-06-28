import React from "react";
import { Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type ValidationRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired";

interface ValidationStatusBadgeProps {
  status: ValidationRequestStatus;
  daysRemaining?: number;
}

/**
 * Badge component for validation request status
 * @param props - Component props
 * @returns JSX element
 */
export const ValidationStatusBadge: React.FC<ValidationStatusBadgeProps> = ({
  status,
  daysRemaining,
}) => {
  /**
   * Resolves the styling, icon, and label for the current validation status.
   * @returns Badge presentation properties for the current status
   */
  const getBadgeStyles = () => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-100",
          text: "text-amber-700",
          icon: <Clock className="h-3.5 w-3.5" />,
          label:
            daysRemaining !== undefined
              ? `Pending (${daysRemaining}d left)`
              : "Pending",
        };
      case "approved":
        return {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          label: "Approved",
        };
      case "rejected":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: "Rejected",
        };
      case "cancelled":
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: "Cancelled",
        };
      case "expired":
        return {
          bg: "bg-gray-100",
          text: "text-gray-500",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: "Expired",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          icon: null,
          label: status,
        };
    }
  };

  const { bg, text, icon, label } = getBadgeStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {label}
    </span>
  );
};

export default ValidationStatusBadge;

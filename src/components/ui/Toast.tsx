import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { X, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { cn } from "../../utils/cn";

/** Visual variant of a toast notification. */
export type ToastType = "success" | "error" | "loading" | "info";

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
}

/**
 * Toast notification component with screen reader support
 * @param props - ToastProps
 * @returns Toast notification element
 */
export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const { t } = useTranslation();
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    loading: Loader2,
    info: Info,
  };

  const Icon = icons[type];

  return (
    <output
      role={type === "error" ? "alert" : undefined}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 p-4",
        type === "success" && "ring-green-500",
        type === "error" && "ring-red-500",
        type === "loading" && "ring-blue-500",
        type === "info" && "ring-blue-500",
      )}
    >
      <div className="flex items-start">
        <Icon
          aria-hidden="true"
          className={cn(
            "h-6 w-6 flex-shrink-0",
            type === "success" && "text-green-500",
            type === "error" && "text-red-500",
            type === "loading" && "text-blue-500 animate-spin",
            type === "info" && "text-blue-500",
          )}
        />
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {message && <p className="mt-1 text-sm text-gray-600">{message}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("toast.dismiss", "Dismiss notification")}
          className="ml-4 flex-shrink-0 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 p-1.5 min-h-[44px] min-w-[44px]"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </output>
  );
};

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface AdminErrorPanelProps {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
}

/**
 * Renders a visible red error panel for admin pages — clearly distinct from
 * empty states so that RPC failures are never mistaken for "no data".
 * @param props - Component props
 * @param props.title - Optional heading; defaults to i18n "admin.error.title"
 * @param props.message - The error detail (RPC name + code + message)
 * @param props.onRetry - Optional retry handler; shows a Retry button when provided
 * @returns The error panel element
 */
export function AdminErrorPanel({
  title,
  message,
  onRetry,
}: AdminErrorPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const heading = title ?? t("admin.error.title", "Data Load Error");

  return (
    <div
      className="rounded-lg border border-red-300 bg-red-50 px-5 py-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-red-100">
          <AlertTriangle
            size={18}
            strokeWidth={2}
            className="text-red-600"
            aria-hidden="true"
          />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">{heading}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry !== undefined && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            >
              {t("common.retry", "Retry")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

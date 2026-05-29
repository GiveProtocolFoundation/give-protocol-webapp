import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "../../utils/cn";

/** Visual variant of a toast notification. */
export type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  persistent: boolean;
  onClose: () => void;
}

const VARIANT_STYLES: Record<
  ToastType,
  { border: string; icon: string; bar: string }
> = {
  success: {
    border: "border-l-emerald-500",
    icon: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  error: {
    border: "border-l-red-500",
    icon: "text-red-500",
    bar: "bg-red-500",
  },
  warning: {
    border: "border-l-amber-500",
    icon: "text-amber-500",
    bar: "bg-amber-500",
  },
  info: {
    border: "border-l-blue-500",
    icon: "text-blue-500",
    bar: "bg-blue-500",
  },
  loading: {
    border: "border-l-blue-500",
    icon: "text-blue-500",
    bar: "bg-blue-500",
  },
};

/** Inline 20x20 SVG icons per variant. */
function VariantIcon({ type }: { type: ToastType }) {
  const cls = cn("h-5 w-5 flex-shrink-0", VARIANT_STYLES[type].icon);

  switch (type) {
    case "success":
      return (
        <svg
          aria-hidden="true"
          className={cls}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "error":
      return (
        <svg
          aria-hidden="true"
          className={cls}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "warning":
      return (
        <svg
          aria-hidden="true"
          className={cls}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    default:
      return (
        <svg
          aria-hidden="true"
          className={cn(cls, type === "loading" ? "animate-spin" : "")}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          {type === "loading" ? (
            <>
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                clipRule="evenodd"
                opacity="0.25"
              />
              <path d="M10 2a8 8 0 018 8h-2a6 6 0 00-6-6V2z" />
            </>
          ) : (
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          )}
        </svg>
      );
  }
}

/**
 * Toast notification component with brand-aligned design
 * @param props - ToastProps
 * @returns Toast notification element
 */
export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  duration,
  persistent,
  onClose,
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = setTimeout(() => {
      setVisible(true);
    }, 10);
    return () => clearTimeout(frame);
  }, []);

  useEffect(() => {
    if (!persistent && barRef.current !== null) {
      const el = barRef.current;
      el.style.transition = "none";
      el.style.width = "100%";
      // Force reflow before starting animation — read offsetWidth to flush paint queue
      // skipcq: JS-0098
      const _reflow = el.offsetWidth; // eslint-disable-line @typescript-eslint/no-unused-vars
      el.style.transition = `width ${String(duration)}ms linear`;
      el.style.width = "0%";
    }
  }, [persistent, duration]);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  const variant = VARIANT_STYLES[type];
  const isError = type === "error";

  return (
    <div
      role="alert"
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "relative overflow-hidden bg-white rounded-xl shadow-2xl border-l-4 px-4 py-3",
        "min-w-[320px] max-w-[420px]",
        "transition-all duration-200 ease-out",
        variant.border,
        visible && !dismissing
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2",
      )}
    >
      <div className="flex items-start gap-3">
        <VariantIcon type={type} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {message !== undefined && message !== "" && (
            <p className="mt-0.5 text-sm text-gray-600">{message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("toast.dismiss", "Dismiss notification")}
          className="flex-shrink-0 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 p-1"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {!persistent && (
        <div
          ref={barRef}
          data-testid="toast-progress-bar"
          className={cn(
            "absolute bottom-0 left-0 h-0.5 rounded-bl-xl",
            variant.bar,
          )}
        />
      )}
    </div>
  );
};

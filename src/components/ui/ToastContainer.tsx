import React, { useMemo, useCallback } from "react";
import { Toast } from "./Toast";
import type { ToastItem } from "@/contexts/ToastContext";

interface ToastContainerProps {
  toasts: ToastItem[];
  maxVisible: number;
  onDismiss: (id: string) => void;
}

/**
 * Renders stacked toast notifications with responsive positioning
 * @param props - ToastContainerProps
 * @returns Container element with toast stack
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  maxVisible,
  onDismiss,
}) => {
  const visibleToasts = useMemo(() => {
    return toasts.slice(-maxVisible).reverse();
  }, [toasts, maxVisible]);

  const createDismissHandler = useCallback(
    (id: string) => () => onDismiss(id),
    [onDismiss],
  );

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 sm:min-w-0 max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:translate-x-0"
    >
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          persistent={toast.persistent}
          onClose={createDismissHandler(toast.id)}
        />
      ))}
    </div>
  );
};

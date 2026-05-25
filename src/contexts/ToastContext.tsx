import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast, ToastType } from "../components/ui/Toast";
import { SecureRandom } from "@/utils/security/index";

interface ToastContextType {
  showToast: (_type: ToastType, _title: string, _message?: string) => void;
}

/** React context for displaying toast notifications. */
// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Provides toast notification functionality to child components
 * @param children - React child elements
 * @returns JSX element with toast context provider and toast display
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      type: ToastType;
      title: string;
      message?: string;
    }>
  >([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = SecureRandom.generateSecureId();
      setToasts((prev) => [...prev, { id, type, title, message }]);

      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
      }
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const createRemoveHandler = useCallback(
    (id: string) => {
      return () => removeToast(id);
    },
    [removeToast],
  );

  const contextValue = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-20 right-4 space-y-4 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={createRemoveHandler(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast notification functionality
 * @returns Object containing showToast function for displaying toast notifications
 * @throws {Error} When used outside of ToastProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

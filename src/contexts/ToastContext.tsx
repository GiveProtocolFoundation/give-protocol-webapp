import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ToastType } from "../components/ui/Toast";
import { ToastContainer } from "../components/ui/ToastContainer";
import { SecureRandom } from "@/utils/security/index";

/** Internal toast state. */
export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  persistent: boolean;
}

/** Options-object signature for showToast. */
export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

/** Overloaded showToast: options-object OR legacy positional args. */
export type ShowToastFn = {
  (options: ToastOptions): void;
  (type: ToastType, title: string, message?: string): void;
};

interface ToastContextType {
  showToast: ShowToastFn;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;

/** React context for displaying toast notifications. */
// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Provides toast notification functionality to child components
 * @param children - React child elements
 * @returns JSX element with toast context provider and toast display
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (...args: [ToastOptions] | [ToastType, string, string?]) => {
      let type: ToastType;
      let title: string;
      let message: string | undefined;
      let duration: number;
      let persistent: boolean;

      if (typeof args[0] === "object" && args[0] !== null && "type" in args[0]) {
        const opts = args[0];
        type = opts.type;
        title = opts.title;
        message = opts.message;
        duration = opts.duration ?? DEFAULT_DURATION;
        persistent = opts.persistent ?? false;
      } else {
        type = args[0] as ToastType;
        title = args[1] as string;
        message = args[2];
        duration = DEFAULT_DURATION;
        persistent = false;
      }

      if (type === "loading") {
        persistent = true;
      }

      const id = SecureRandom.generateSecureId();
      const toast: ToastItem = { id, type, title, message, duration, persistent };

      setToasts((prev) => {
        const next = [...prev, toast];
        return next;
      });

      if (!persistent) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [],
  ) as ShowToastFn;

  const contextValue = React.useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        toasts={toasts}
        maxVisible={MAX_VISIBLE}
        onDismiss={removeToast}
      />
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

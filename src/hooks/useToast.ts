import { useContext } from "react";
import { ToastContext } from "../contexts/ToastContext";
import type { ShowToastFn } from "../contexts/ToastContext";

export type { ShowToastFn };

/**
 * Toast notification hook for accessing toast context functionality
 * @returns Object containing showToast function for displaying notifications
 * @throws {Error} Throws error if used outside ToastProvider context
 * @example
 * ```tsx
 * const { showToast } = useToast();
 *
 * // New options-object signature
 * showToast({ type: 'success', title: 'Saved', message: 'Profile updated', duration: 3000 });
 *
 * // Legacy positional signature (backward-compatible)
 * showToast('error', 'Connection Failed', 'Unable to connect to wallet');
 * ```
 */
export function useToast(): { showToast: ShowToastFn } {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

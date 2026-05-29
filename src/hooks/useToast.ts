import { useContext } from "react";
import { ToastContext } from "../contexts/ToastContext";
import type { ShowToastFn } from "../contexts/ToastContext";

export type { ShowToastFn };

/**
 * Toast notification hook for accessing toast context functionality
 * @returns Object containing showToast (returns toast id) and dismissToast(id) for programmatic dismissal
 * @throws {Error} Throws error if used outside ToastProvider context
 * @example
 * ```tsx
 * const { showToast, dismissToast } = useToast();
 *
 * // New options-object signature — returns toast id
 * const id = showToast({ type: 'info', title: 'Pending', persistent: true });
 * // Later, dismiss programmatically:
 * dismissToast(id);
 *
 * // Legacy positional signature (backward-compatible)
 * showToast('error', 'Connection Failed', 'Unable to connect to wallet');
 * ```
 */
export function useToast(): { showToast: ShowToastFn; dismissToast: (id: string) => void } {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

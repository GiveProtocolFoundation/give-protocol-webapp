/**
 * Mock logger for Jest tests - provides same interface as real Logger
 */
export const Logger = {
  /**
   * Log an info message
   * @param message - The message to log
   * @param metadata - Optional metadata object
   */
  info(message: string, metadata?: Record<string, unknown>) {
    console.log(`[INFO] ${message}`, metadata);
  },

  /**
   * Log a warning message
   * @param message - The message to log
   * @param metadata - Optional metadata object
   */
  warn(message: string, metadata?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, metadata);
  },

  /**
   * Log an error message
   * @param message - The message to log
   * @param metadata - Optional metadata object
   */
  error(message: string, metadata?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, metadata);
  },

  /**
   * Get all logged entries (mock returns empty array)
   * @returns Empty array for tests
   */
  getLogs() {
    return [];
  },

  /**
   * Clear all logged entries (no-op for tests)
   */
  clearLogs() {
    // No-op for tests
  },

  /**
   * Set logging level (no-op for tests)
   */
  setLevel() {
    // No-op for tests
  },

  /**
   * Submit logs to Sentry (no-op for tests)
   * @returns Promise that resolves immediately
   */
  submitToSentry(): Promise<void> {
    return Promise.resolve();
  },
};

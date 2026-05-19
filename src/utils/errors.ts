import { AuthErrorCode } from "../types/auth";

/** Authentication error with a typed error code for programmatic handling. */
export interface AuthError extends Error {
  code: AuthErrorCode;
}

/**
 * Converts an authentication error code to a human-readable error message.
 *
 * @function getAuthErrorMessage
 * @param {AuthErrorCode} code - The authentication error code
 * @returns {string} A user-friendly error message
 * @example
 * ```typescript
 * const message = getAuthErrorMessage('invalid_credentials');
 * console.log(message); // "Invalid email or password"
 * ```
 */
export function getAuthErrorMessage(code: AuthErrorCode): string {
  // skipcq: SCT-A000 - These are user-facing error messages, not actual secrets
  const messages: Record<AuthErrorCode, string> = {
    invalid_credentials: "Invalid email or password",
    email_taken: "This email is already registered",
    weak_password: "Password must be at least 8 characters long",
    invalid_email: "Please enter a valid email address",
    network_error: "Network error. Please check your connection",
  };

  return messages[code] || "An unexpected error occurred";
}

/**
 * Creates a standardized AuthError object with a specific error code.
 *
 * @function createAuthError
 * @param {AuthErrorCode} code - The authentication error code
 * @returns {AuthError} An error object with the code and corresponding message
 * @example
 * ```typescript
 * const error = createAuthError('weak_password');
 * throw error; // Throws: "Password must be at least 8 characters long"
 * ```
 */
export function createAuthError(code: AuthErrorCode): AuthError {
  const error = new Error(getAuthErrorMessage(code)) as AuthError;
  error.code = code;
  return error;
}

/** Machine-readable authentication error codes. */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'weak_password'
  | 'invalid_email'
  | 'network_error';

/** Authentication error with a typed error code. */
export interface AuthError extends Error {
  code: AuthErrorCode;
}

/** Response from authentication operations, containing user and session data. */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  } | null;
  session: unknown | null;
}

/** Distinguishes between donor and charity account types. */
export type UserType = 'donor' | 'charity';

/** Minimal user profile returned by authentication responses. */
export interface UserProfile {
  id: string;
  user_id: string;
  type: UserType;
  created_at: string;
}

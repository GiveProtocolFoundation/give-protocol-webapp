/**
 * CSRF protection utility that generates and validates tokens
 * Uses class pattern with private constructor due to maintaining static state (token)
 */
/**
 * Static CSRF token holder that generates a per-session token, stores it in a same-site cookie,
 * and exposes helpers for retrieval, validation, and header construction.
 */
// skipcq: JS-0327 - Class with static state (token) requires singleton pattern, not namespace object
export class CSRFProtection {
  private static token: string | null = null;
  private static initializationCount = 0;

  /**
   * Prevents instantiation; all functionality is exposed through static methods.
   * @throws Always throws to enforce the static-only usage pattern.
   */
  // Private constructor prevents instantiation - this is a singleton utility class with state
  private constructor() {
    throw new Error(
      "CSRFProtection cannot be instantiated. Use static methods instead.",
    );
  }

  /**
   * Generates a fresh CSRF token and writes it to the `csrf-token` cookie with `SameSite=Strict`.
   */
  static initialize(): void {
    this.initializationCount++;
    this.token = crypto.randomUUID();
    document.cookie = `csrf-token=${this.token}; path=/; samesite=strict`;
  }

  /**
   * Returns the current CSRF token, lazily initializing one if none has been generated yet.
   * @returns The active CSRF token string.
   * @throws If token initialization fails.
   */
  static getToken(): string {
    if (!this.token) {
      this.initialize();
    }

    if (!this.token) {
      throw new Error("Failed to initialize CSRF token");
    }

    return this.token;
  }

  /**
   * Compares a candidate token against the stored token.
   * @param token - The token value to verify.
   * @returns `true` when the candidate matches the stored token, otherwise `false`.
   */
  static validate(token: string): boolean {
    return token === this.token;
  }

  /**
   * Builds the request header map carrying the current CSRF token.
   * @returns An object with the `X-CSRF-Token` header populated.
   */
  static getHeaders(): Record<string, string> {
    return {
      "X-CSRF-Token": this.getToken(),
    };
  }
}

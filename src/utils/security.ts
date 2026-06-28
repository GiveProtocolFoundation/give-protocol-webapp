import { Logger } from "@/utils/logger";

/**
 * Security manager for handling OAuth state validation and CSRF protection
 * Implements singleton pattern and automatic cleanup of expired security tokens
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private readonly oauthStates: Map<string, number> = new Map();
  private readonly STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  /**
   * Private constructor that schedules a periodic sweep for expired OAuth state tokens.
   */
  private constructor() {
    // Clean up expired states periodically
    setInterval(() => this.cleanupExpiredStates(), 60 * 1000);
  }

  /** Returns the singleton SecurityManager instance, creating it on first call. */
  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /** Generates a random OAuth state token and stores it with the current timestamp. */
  generateOAuthState(): string {
    const state = crypto.randomUUID();
    this.oauthStates.set(state, Date.now());
    return state;
  }

  /** Validates and consumes an OAuth state token, returning false if missing or expired. */
  validateOAuthState(state: string): boolean {
    const timestamp = this.oauthStates.get(state);
    if (!timestamp) return false;

    const isValid = Date.now() - timestamp < this.STATE_TIMEOUT;
    this.oauthStates.delete(state);

    if (!isValid) {
      Logger.warn("Invalid or expired OAuth state detected", {
        state,
        timestamp: new Date(timestamp).toISOString(),
      });
    }

    return isValid;
  }

  /** Removes OAuth state entries that have exceeded the timeout window. */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, timestamp] of this.oauthStates.entries()) {
      if (now - timestamp >= this.STATE_TIMEOUT) {
        this.oauthStates.delete(state);
      }
    }
  }
}

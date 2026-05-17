import { Logger } from "../logger";
import { ENV } from "@/config/env";

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  maxAge?: number;
  domain?: string;
  path?: string;
}

/**
 * Cross-Site Request Forgery (CSRF) protection implementation
 * @class CSRFProtection
 * @description Singleton class that implements CSRF protection using cryptographically secure tokens. Generates and validates tokens with timing-safe comparison to prevent timing attacks. Automatically manages secure HTTP-only cookies with proper SameSite configuration for maximum security.
 * @example
 * ```typescript
 * const csrf = CSRFProtection.getInstance();
 *
 * // Get CSRF token for requests
 * const token = csrf.getToken();
 *
 * // Add CSRF headers to fetch requests
 * const headers = csrf.getHeaders();
 * fetch('/api/secure-endpoint', {
 *   method: 'POST',
 *   headers: {
 *     ...headers,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify(data)
 * });
 *
 * // Validate token on server side
 * const isValid = await csrf.validate(receivedToken);
 *
 * // Refresh token after authentication changes
 * csrf.refreshToken();
 * ```
 */
export class CSRFProtection {
  private static instance: CSRFProtection;
  private token: string | null = null;
  private readonly headerName = "X-CSRF-Token";
  private readonly cookieName = "XSRF-TOKEN";
  private lastCookieSet: string | null = null;
  private validationAttempts = 0;
  private readonly cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    maxAge: 7200, // 2 hours
    domain: ENV.APP_DOMAIN,
  };

  /**
   * Private constructor to enforce the singleton pattern; use {@link CSRFProtection.getInstance} instead.
   */
  private constructor() {
    // Constructor kept simple and synchronous
  }

  /**
   * Returns the singleton {@link CSRFProtection} instance, creating it on first call.
   * @returns The shared `CSRFProtection` instance.
   */
  static getInstance(): CSRFProtection {
    if (!this.instance) {
      this.instance = new CSRFProtection();
    }
    return this.instance;
  }

  /**
   * Generates a cryptographically secure 256-bit hex token and writes it to the CSRF cookie.
   * @returns The newly generated token.
   * @throws If secure random generation or cookie assignment fails.
   */
  private initializeTokenSync(): string {
    try {
      // Generate a cryptographically secure token synchronously
      const buffer = new Uint8Array(32);
      crypto.getRandomValues(buffer);
      const token = Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Set the cookie with secure options
      this.setCookie(this.cookieName, token, this.cookieOptions);

      Logger.info("CSRF token initialized");
      return token;
    } catch (error) {
      Logger.error("Failed to initialize CSRF token", { error });
      throw error;
    }
  }

  /**
   * Writes a cookie with the supplied attributes (Max-Age, Domain, Path, Secure, HttpOnly, SameSite).
   * @param name - The cookie name.
   * @param value - The cookie value.
   * @param options - Cookie attributes to apply.
   */
  private setCookie(name: string, value: string, options: CookieOptions): void {
    let cookie = `${name}=${value}`;

    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options.domain) cookie += `; Domain=${options.domain}`;
    if (options.path) cookie += `; Path=${options.path || "/"}`;
    if (options.secure) cookie += "; Secure";
    if (options.httpOnly) cookie += "; HttpOnly";
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;

    document.cookie = cookie;
    this.lastCookieSet = cookie;
  }

  /**
   * Returns the current CSRF token, generating one on first use.
   * @returns The active CSRF token.
   */
  getToken(): string {
    if (!this.token) {
      this.token = this.initializeTokenSync();
    }
    return this.token;
  }

  /**
   * Validates a received CSRF token against the stored token.
   * @param token - The CSRF token to validate, typically received from a request header.
   * @returns `true` if the token matches the stored token, or `false` if either token is missing or the values do not match.
   */
  validate(token: string): boolean {
    if (!this.token || !token) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.timingSafeEqual(token, this.token);
  }

  /**
   * Compares two strings in constant time to prevent timing attacks during token validation.
   * @param a - The first string to compare.
   * @param b - The second string to compare.
   * @returns `true` if both strings have the same length and contents, otherwise `false`.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    this.validationAttempts++;

    if (a.length !== b.length) {
      return false;
    }

    const aBuffer = new TextEncoder().encode(a);
    const bBuffer = new TextEncoder().encode(b);

    return crypto.subtle.timingSafeEqual(aBuffer, bBuffer);
  }

  /**
   * Builds a header map containing the CSRF token under the configured header name.
   * @returns Header map suitable for attaching to outbound requests.
   */
  getHeaders(): Record<string, string> {
    return {
      [this.headerName]: this.getToken(),
    };
  }

  /**
   * Replaces the current token with a freshly generated one, also resetting the CSRF cookie.
   */
  refreshToken(): void {
    this.token = this.initializeTokenSync();
  }
}

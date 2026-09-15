/**
 * Validates if the provided email address follows proper email format
 * @param email - The email string to validate
 * @returns true if email format is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  // Safe email regex that avoids catastrophic backtracking
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates if the password meets minimum security requirements
 * @param password - The password string to validate
 * @returns true if password is at least 8 characters long, false otherwise
 */
export function validatePassword(password: string): boolean {
  // Only require minimum length of 8 characters
  return password.length >= 8;
}

/**
 * Validates if a monetary amount is within acceptable range and finite
 * @param amount - The numeric amount to validate
 * @returns true if amount is positive, <= 1,000,000, and finite
 */
export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 && Number.isFinite(amount);
}

/** Maximum accepted donation amount on every payment path (GIV-984). */
export const MAX_DONATION_AMOUNT = 1000000;

/**
 * Returns the live validation error for a donation amount, or null when valid.
 * Shared by the crypto and fiat donation paths so both enforce the same
 * 0 < amount <= 1,000,000 bound (GIV-984).
 * @param amount - The numeric amount to validate
 * @returns Error message when invalid, null when valid
 */
export function getDonationAmountError(amount: number): string | null {
  if (Number.isNaN(amount) || amount <= 0) {
    return "Please enter an amount greater than 0";
  }
  if (!Number.isFinite(amount) || amount > MAX_DONATION_AMOUNT) {
    return `Maximum donation amount is ${MAX_DONATION_AMOUNT.toLocaleString("en-US")}`;
  }
  return null;
}

/**
 * Validates authentication input and throws errors for invalid data
 * @param email - The email address to validate
 * @param password - The password to validate
 * @throws {Error} When email format is invalid
 * @throws {Error} When password doesn't meet requirements
 */
export function validateAuthInput(email: string, password: string): void {
  if (!validateEmail(email)) {
    throw new Error("Please enter a valid email address");
  }

  if (!validatePassword(password)) {
    throw new Error("Password must be at least 8 characters long");
  }
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string with dangerous characters removed
 */
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input.replaceAll(/[<>'"]/g, "");
}

/**
 * Validates uploaded file size and type restrictions
 * @param file - The File object to validate
 * @throws {Error} When file size exceeds 5MB limit
 * @throws {Error} When file type is not PDF, JPEG, or PNG
 */
export function validateFileUpload(file: File): void {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

  if (file.size > maxSize) {
    throw new Error("File size must be less than 5MB");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("File type must be PDF, JPEG, or PNG");
  }
}

/**
 * Checks if a numeric amount is valid for transactions
 * @param amount - The numeric amount to validate
 * @returns true if amount is positive, <= 1,000,000, and not NaN
 */
export function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 && !Number.isNaN(amount);
}

/**
 * Validates if a URL is properly formatted and uses HTTPS protocol
 * @param url - The URL string to validate
 * @returns true if URL is valid and uses HTTPS, false otherwise
 */
export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:";
  } catch (_e) {
    return false;
  }
}

/**
 * Validates basic phone number format with optional country code
 * @param phone - The phone number string to validate
 * @returns true if phone number matches basic format pattern
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic phone validation - can be enhanced for specific formats
  return /^\+?\(?[0-9]{3}\)?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(phone);
}

/**
 * Validates if a name meets length requirements
 * @param name - The name string to validate
 * @returns true if trimmed name is between 2-100 characters
 */
export function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}
